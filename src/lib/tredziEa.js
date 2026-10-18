// TredziSync.mq5 template. BrokerTab replaces __PUSH_URL__ and __SYNC_KEY__ (once each) when the user downloads it.
// String.raw keeps the MQL5 backslashes (\r\n, \\, \") exactly as written. Do not add backticks or dollar-brace to the MQL5 code.
export const TREDZI_EA = String.raw`//+------------------------------------------------------------------+
//| TredziSync.mq5 - sends open positions and closed trades to Tredzi |
//| It also enforces your partner's "Stay out" lock: while you are   |
//| locked, new trades and pending orders are closed automatically.  |
//| It never opens trades, and it does nothing when you are not locked.|
//+------------------------------------------------------------------+
#property copyright "Tredzi"
#property version   "2.10"

#include <Trade\Trade.mqh>

input string InpPushUrl   = "__PUSH_URL__";
input string InpSyncKey   = "__SYNC_KEY__";
input int    InpOpenSecs  = 10;   // send interval while a trade is open
input int    InpIdleSecs  = 30;   // send interval while flat (heartbeat)
input int    InpHistoryDays = 60; // closed trades to send the first time
input bool   InpEnforceLock   = true;  // close new trades while the partner stay-out lock is on
input bool   InpCloseExisting = false; // also close trades that were already open when the lock started

bool     g_backfilled = false;
int      g_recheck    = 0;
datetime g_lastPos    = 0;
datetime g_lastHist   = 0;
string   g_status     = "starting";
CTrade   g_trade;
datetime g_lastNoLock = 0;   // last time Tredzi told us we were NOT locked (broker time)
string   g_gvUntil    = "";
string   g_gvAllow    = "";

//--- helpers -------------------------------------------------------
string Esc(string s)
{
   StringReplace(s, "\\", "\\\\");
   StringReplace(s, "\"", "\\\"");
   return s;
}

string Num(double v, int digits = 8)
{
   return DoubleToString(v, digits);
}

// MT5 times are broker-server time; Tredzi wants unix seconds in UTC.
long Utc(datetime t)
{
   double off = (double)(TimeTradeServer() - TimeGMT());
   long offRounded = (long)(MathRound(off / 900.0) * 900.0);
   return (long)t - offRounded;
}

string AccountJson()
{
   bool demo = (AccountInfoInteger(ACCOUNT_TRADE_MODE) == ACCOUNT_TRADE_MODE_DEMO);
   return "\"account\":{\"login\":\"" + (string)AccountInfoInteger(ACCOUNT_LOGIN) + "\"," +
          "\"server\":\"" + Esc(AccountInfoString(ACCOUNT_SERVER)) + "\"," +
          "\"currency\":\"" + Esc(AccountInfoString(ACCOUNT_CURRENCY)) + "\"," +
          "\"demo\":" + (demo ? "true" : "false") + "}";
}

//--- stay-out lock (set from the Partner tab) -----------------------
long NowMs() { return (long)TimeGMT() * 1000; }

string AllowName(ulong ticket) { return g_gvAllow + (string)ticket; }

string LocalClock(long untilMs)
{
   datetime t = (datetime)(untilMs / 1000 + (long)(TimeLocal() - TimeGMT()));
   return TimeToString(t, TIME_MINUTES);
}

bool IsLocked()
{
   if(!InpEnforceLock || !GlobalVariableCheck(g_gvUntil)) return false;
   return (long)GlobalVariableGet(g_gvUntil) > NowMs();
}

string LockLine()
{
   if(!InpEnforceLock) return "\nStay-out lock: switched off in the add-on settings";
   string s = IsLocked()
      ? "\nSTAY-OUT LOCK ON until " + LocalClock((long)GlobalVariableGet(g_gvUntil)) + ". New trades are closed automatically."
      : "\nStay-out lock: ready (you are not locked)";
   if(!TerminalInfoInteger(TERMINAL_TRADE_ALLOWED) || !MQLInfoInteger(MQL_TRADE_ALLOWED))
      s += "\nAlgo Trading is OFF, so the lock cannot close trades. Switch it on.";
   return s;
}

void StartLock(long untilMs)
{
   GlobalVariableSet(g_gvUntil, (double)untilMs);
   GlobalVariablesDeleteAll(g_gvAllow);
   // Trades that were open BEFORE the lock stay allowed, so you can manage them. A trade opened after the last
   // time Tredzi said "not locked" counts as new, so it can't slip in during the moment before the lock reached us.
   if(!InpCloseExisting)
   {
      for(int i = 0; i < PositionsTotal(); i++)
      {
         ulong t = PositionGetTicket(i);
         if(t == 0) continue;
         datetime opened = (datetime)PositionGetInteger(POSITION_TIME);
         if(g_lastNoLock == 0 || opened <= g_lastNoLock)
            GlobalVariableSet(AllowName(t), PositionGetDouble(POSITION_VOLUME));
      }
   }
   string msg = "Tredzi: your partner asked you to stay out until " + LocalClock(untilMs) + ". New trades will be closed.";
   Print(msg);
   Alert(msg);
}

void EndLock()
{
   GlobalVariableDel(g_gvUntil);
   GlobalVariablesDeleteAll(g_gvAllow);
   Print("Tredzi: the stay-out lock is over. Trade carefully.");
}

// known = Tredzi answered. No answer (offline) keeps the lock we already know about until it runs out.
void ApplyServerLock(bool known, bool active, long untilMs)
{
   if(!known) return;
   if(active && untilMs > NowMs())
   {
      if(!GlobalVariableCheck(g_gvUntil) || (long)GlobalVariableGet(g_gvUntil) <= NowMs()) StartLock(untilMs);
      else GlobalVariableSet(g_gvUntil, (double)untilMs);
   }
   else
   {
      g_lastNoLock = TimeTradeServer();
      if(GlobalVariableCheck(g_gvUntil)) EndLock(); // lifted by your partner, or over
   }
}

void Enforce()
{
   if(!InpEnforceLock) return;
   if(!IsLocked())
   {
      if(GlobalVariableCheck(g_gvUntil)) EndLock();
      return;
   }
   if(!TerminalInfoInteger(TERMINAL_TRADE_ALLOWED) || !MQLInfoInteger(MQL_TRADE_ALLOWED)) return;
   bool hedging = ((ENUM_ACCOUNT_MARGIN_MODE)AccountInfoInteger(ACCOUNT_MARGIN_MODE) == ACCOUNT_MARGIN_MODE_RETAIL_HEDGING);

   // pending orders would open a new trade later: remove them all
   for(int i = OrdersTotal() - 1; i >= 0; i--)
   {
      ulong ot = OrderGetTicket(i);
      if(ot > 0) g_trade.OrderDelete(ot);
   }
   // positions: close anything that was not allowed when the lock started
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      ulong tk = PositionGetTicket(i);
      if(tk == 0) continue;
      string sym = PositionGetString(POSITION_SYMBOL);
      double vol = PositionGetDouble(POSITION_VOLUME);
      string nm  = AllowName(tk);
      double allowed = GlobalVariableCheck(nm) ? GlobalVariableGet(nm) : 0.0;
      g_trade.SetTypeFillingBySymbol(sym);
      g_trade.SetDeviationInPoints(100);
      if(allowed <= 0.0)
      {
         if(g_trade.PositionClose(tk)) Print("Tredzi lock: closed new trade #", tk, " on ", sym);
         else Print("Tredzi lock: could not close #", tk, " (", g_trade.ResultRetcodeDescription(), ")");
      }
      else if(vol > allowed + 1e-9)
      {
         // netting account: someone added to an old position. Close only the extra part.
         double step  = SymbolInfoDouble(sym, SYMBOL_VOLUME_STEP);
         double minv  = SymbolInfoDouble(sym, SYMBOL_VOLUME_MIN);
         double extra = vol - allowed;
         if(step > 0) extra = MathFloor(extra / step + 1e-9) * step;
         if(extra >= minv)
         {
            bool ok = hedging ? g_trade.PositionClosePartial(tk, extra) : g_trade.PositionClosePartial(sym, extra);
            if(!ok) Print("Tredzi lock: could not trim #", tk, " (", g_trade.ResultRetcodeDescription(), ")");
         }
      }
      else if(vol < allowed - 1e-9)
         GlobalVariableSet(nm, vol); // you reduced it: you can't add it back during the lock
   }
}

long ReadNumber(string s, int from)
{
   long v = 0;
   int len = StringLen(s);
   for(int i = from; i < len; i++)
   {
      ushort c = StringGetCharacter(s, i);
      if(c < '0' || c > '9') break;
      v = v * 10 + (c - '0');
   }
   return v;
}

// Tredzi answers every send with {"ok":true,...,"lock":null} or {"lock":{"active":true,"until":<ms>}}
void HandleLockReply(string r)
{
   bool known = (StringFind(r, "\"ok\":true") >= 0);
   bool active = false;
   long untilMs = 0;
   if(known)
   {
      int p = StringFind(r, "\"lock\":");
      if(p >= 0)
      {
         string tail = StringSubstr(r, p + 7);
         if(StringGetCharacter(tail, 0) != 'n')
         {
            active = (StringFind(tail, "\"active\":true") >= 0);
            int u = StringFind(tail, "\"until\":");
            if(u >= 0) untilMs = ReadNumber(tail, u + 8);
         }
      }
   }
   ApplyServerLock(known, active, untilMs);
   Enforce();
}

void Show(string s)
{
   g_status = s;
   Comment("Tredzi sync: " + s + LockLine());
}

//--- HTTP ----------------------------------------------------------
bool Post(string body)
{
   char data[];
   char res[];
   string resHeaders;
   StringToCharArray(body, data, 0, WHOLE_ARRAY, CP_UTF8);
   ArrayResize(data, ArraySize(data) - 1); // drop the trailing zero
   string headers = "Content-Type: application/json\r\nX-Tredzi-Key: " + InpSyncKey + "\r\n";
   ResetLastError();
   int code = WebRequest("POST", InpPushUrl, headers, 8000, data, res, resHeaders);
   if(code == -1)
   {
      int err = GetLastError();
      if(err == 4014)
         Show("BLOCKED. Tools > Options > Expert Advisors > tick Allow WebRequest and add the Tredzi address.");
      else
         Show("cannot reach Tredzi (error " + (string)err + "). Check your internet.");
      return false;
   }
   if(code >= 200 && code < 300)
   {
      Show("connected, last sent " + TimeToString(TimeLocal(), TIME_SECONDS));
      HandleLockReply(CharArrayToString(res, 0, WHOLE_ARRAY, CP_UTF8));
      Show(g_status);
      return true;
   }
   string reply = CharArrayToString(res, 0, WHOLE_ARRAY, CP_UTF8);
   if(code == 401) Show("sync key not accepted. Create a new key in Tredzi and download the file again.");
   else if(code == 409) Show("this key belongs to another MT5 account. Create a new key in Tredzi.");
   else Show("server said " + (string)code + " " + StringSubstr(reply, 0, 120));
   return false;
}

//--- open positions ------------------------------------------------
bool PushPositions()
{
   string arr = "";
   int n = PositionsTotal();
   for(int i = 0; i < n; i++)
   {
      ulong tk = PositionGetTicket(i);
      if(tk == 0) continue;
      string sym  = PositionGetString(POSITION_SYMBOL);
      long   type = PositionGetInteger(POSITION_TYPE);
      string side = (type == POSITION_TYPE_BUY) ? "buy" : "sell";
      double profit = PositionGetDouble(POSITION_PROFIT) + PositionGetDouble(POSITION_SWAP);
      string one = "{\"id\":\"" + (string)PositionGetInteger(POSITION_IDENTIFIER) + "\"," +
                   "\"sym\":\"" + Esc(sym) + "\"," +
                   "\"side\":\"" + side + "\"," +
                   "\"vol\":" + Num(PositionGetDouble(POSITION_VOLUME), 2) + "," +
                   "\"openP\":" + Num(PositionGetDouble(POSITION_PRICE_OPEN)) + "," +
                   "\"openT\":" + (string)Utc((datetime)PositionGetInteger(POSITION_TIME)) + "," +
                   "\"profit\":" + Num(profit, 2) + "," +
                   "\"sl\":" + Num(PositionGetDouble(POSITION_SL)) + "," +
                   "\"tp\":" + Num(PositionGetDouble(POSITION_TP)) + "}";
      if(arr != "") arr += ",";
      arr += one;
   }
   string body = "{" + AccountJson() + ",\"positions\":[" + arr + "]}";
   g_lastPos = TimeLocal();
   return Post(body);
}

//--- closed trades -------------------------------------------------
// One trade per position: all its deals are added up (profit + commission + swap + fee).
bool BuildTrade(ulong pid, string &json)
{
   if(!HistorySelectByPosition(pid)) return false;
   int n = HistoryDealsTotal();
   double inVol = 0, inPx = 0, outVol = 0, outPx = 0, net = 0;
   datetime openT = 0, closeT = 0;
   string sym = "";
   int side = -1;      // 0 buy, 1 sell
   long outType = -1;
   for(int i = 0; i < n; i++)
   {
      ulong d = HistoryDealGetTicket(i);
      if(d == 0) continue;
      long type = HistoryDealGetInteger(d, DEAL_TYPE);
      if(type != DEAL_TYPE_BUY && type != DEAL_TYPE_SELL) continue;
      long entry = HistoryDealGetInteger(d, DEAL_ENTRY);
      double v = HistoryDealGetDouble(d, DEAL_VOLUME);
      double p = HistoryDealGetDouble(d, DEAL_PRICE);
      datetime t = (datetime)HistoryDealGetInteger(d, DEAL_TIME);
      net += HistoryDealGetDouble(d, DEAL_PROFIT) + HistoryDealGetDouble(d, DEAL_COMMISSION) +
             HistoryDealGetDouble(d, DEAL_SWAP) + HistoryDealGetDouble(d, DEAL_FEE);
      if(sym == "") sym = HistoryDealGetString(d, DEAL_SYMBOL);
      if(entry == DEAL_ENTRY_IN)
      {
         inVol += v; inPx += p * v;
         if(openT == 0 || t < openT) openT = t;
         if(side < 0) side = (type == DEAL_TYPE_BUY) ? 0 : 1;
      }
      else
      {
         outVol += v; outPx += p * v;
         if(t > closeT) closeT = t;
         outType = type;
      }
   }
   if(outVol <= 0 || closeT == 0 || sym == "") return false;
   if(side < 0) side = (outType == DEAL_TYPE_BUY) ? 1 : 0; // opened before the history window
   double vol = (inVol > 0) ? inVol : outVol;
   double openP = (inVol > 0) ? inPx / inVol : 0;
   double closeP = outPx / outVol;
   json = "{\"id\":\"" + (string)pid + "\"," +
          "\"sym\":\"" + Esc(sym) + "\"," +
          "\"side\":\"" + (side == 0 ? "buy" : "sell") + "\"," +
          "\"vol\":" + Num(vol, 2) + "," +
          "\"openP\":" + Num(openP) + "," +
          "\"openT\":" + (string)(openT > 0 ? Utc(openT) : 0) + "," +
          "\"closeP\":" + Num(closeP) + "," +
          "\"closeT\":" + (string)Utc(closeT) + "," +
          "\"net\":" + Num(net, 2) + "}";
   return true;
}

bool PushHistory(datetime from)
{
   if(!HistorySelect(from, TimeCurrent() + 86400)) return false;
   int total = HistoryDealsTotal();
   ulong ids[];
   int count = 0;
   for(int i = 0; i < total; i++)
   {
      ulong d = HistoryDealGetTicket(i);
      if(d == 0) continue;
      long type = HistoryDealGetInteger(d, DEAL_TYPE);
      if(type != DEAL_TYPE_BUY && type != DEAL_TYPE_SELL) continue;
      long entry = HistoryDealGetInteger(d, DEAL_ENTRY);
      if(entry != DEAL_ENTRY_OUT && entry != DEAL_ENTRY_OUT_BY && entry != DEAL_ENTRY_INOUT) continue;
      ulong pid = (ulong)HistoryDealGetInteger(d, DEAL_POSITION_ID);
      if(pid == 0) continue;
      bool seen = false;
      for(int k = 0; k < count; k++) if(ids[k] == pid) { seen = true; break; }
      if(seen) continue;
      ArrayResize(ids, count + 1);
      ids[count++] = pid;
   }
   // History selection is replaced for each position below, so the list above is collected first.
   string chunk = "";
   int inChunk = 0;
   bool ok = true;
   for(int k = 0; k < count; k++)
   {
      if(PositionSelectByTicket(ids[k])) continue; // still open (partly closed): wait until it is flat
      string one;
      if(!BuildTrade(ids[k], one)) continue;
      if(chunk != "") chunk += ",";
      chunk += one;
      inChunk++;
      if(inChunk >= 100)
      {
         ok = Post("{" + AccountJson() + ",\"deals\":[" + chunk + "]}") && ok;
         chunk = ""; inChunk = 0;
      }
   }
   if(inChunk > 0) ok = Post("{" + AccountJson() + ",\"deals\":[" + chunk + "]}") && ok;
   g_lastHist = TimeLocal();
   return ok;
}

//--- events --------------------------------------------------------
int OnInit()
{
   g_gvUntil = "TZ_LOCK_UNTIL_" + (string)AccountInfoInteger(ACCOUNT_LOGIN);
   g_gvAllow = "TZ_ALLOW_" + (string)AccountInfoInteger(ACCOUNT_LOGIN) + "_";
   if(StringFind(InpSyncKey, "__SYNC") >= 0 || StringFind(InpPushUrl, "__PUSH") >= 0 || StringLen(InpSyncKey) < 10)
   {
      Show("this file has no sync key. Download it again from the Tredzi Broker tab.");
      return INIT_FAILED;
   }
   EventSetTimer(2);
   Show("starting");
   OnTimer();
   return INIT_SUCCEEDED;
}

void OnDeinit(const int reason)
{
   EventKillTimer();
   Comment("");
}

void OnTimer()
{
   Enforce();
   if(!TerminalInfoInteger(TERMINAL_CONNECTED)) { Show("MT5 is offline"); return; }
   int gap = (PositionsTotal() > 0) ? InpOpenSecs : InpIdleSecs;
   if(g_lastPos == 0 || TimeLocal() - g_lastPos >= gap) PushPositions();

   if(!g_backfilled)
   {
      if(PushHistory(TimeCurrent() - (datetime)InpHistoryDays * 86400)) g_backfilled = true;
   }
   else if(g_recheck > 0 || TimeLocal() - g_lastHist >= 60)
   {
      PushHistory(TimeCurrent() - 3 * 86400);
      if(g_recheck > 0) g_recheck--;
   }
}

void OnTradeTransaction(const MqlTradeTransaction &trans, const MqlTradeRequest &request, const MqlTradeResult &result)
{
   // react the moment a new order or trade appears, not only on the next timer tick
   if(trans.type == TRADE_TRANSACTION_ORDER_ADD || trans.type == TRADE_TRANSACTION_DEAL_ADD) Enforce();
   if(trans.type == TRADE_TRANSACTION_DEAL_ADD)
   {
      g_recheck = 4;      // send closed trades on the next few timer ticks
      PushPositions();    // update the open position right away
   }
}
//+------------------------------------------------------------------+
`;
