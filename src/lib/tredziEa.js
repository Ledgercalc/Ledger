// TredziSync.mq5 template. BrokerTab replaces __PUSH_URL__ and __SYNC_KEY__ (once each) when the user downloads it.
// String.raw keeps the MQL5 backslashes (\r\n, \\, \") exactly as written. Do not add backticks or dollar-brace to the MQL5 code.
export const TREDZI_EA = String.raw`//+------------------------------------------------------------------+
//| TredziSync.mq5 - sends open positions and closed trades to Tredzi |
//| Read-only: this add-on never places, changes or closes a trade.   |
//+------------------------------------------------------------------+
#property copyright "Tredzi"
#property version   "2.00"

input string InpPushUrl   = "__PUSH_URL__";
input string InpSyncKey   = "__SYNC_KEY__";
input int    InpOpenSecs  = 10;   // send interval while a trade is open
input int    InpIdleSecs  = 30;   // send interval while flat (heartbeat)
input int    InpHistoryDays = 60; // closed trades to send the first time

bool     g_backfilled = false;
int      g_recheck    = 0;
datetime g_lastPos    = 0;
datetime g_lastHist   = 0;
string   g_status     = "starting";

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

void Show(string s)
{
   g_status = s;
   Comment("Tredzi sync: " + s);
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
   if(trans.type == TRADE_TRANSACTION_DEAL_ADD)
   {
      g_recheck = 4;      // send closed trades on the next few timer ticks
      PushPositions();    // update the open position right away
   }
}
//+------------------------------------------------------------------+
`;
