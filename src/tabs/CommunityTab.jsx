import { useEffect, useRef, useState } from "react";
import { PlanName } from "../components/PlanBadge.jsx";
import { Avatar } from "../components/ui.jsx";
import LedgerCommunity from "./LedgerCommunity.jsx";
import PostComposer, { PostContent, HelpfulIcon } from "../components/PostComposer.jsx";
import { plainOf } from "../lib/ledgerPost.js";
import { FEED_REACTIONS, avatarStyleFor, feedTimeAgo } from "../lib/feed.js";
import { TAP, display, mono, palette, sans } from "../lib/theme.js";
import { AlertTriangle, ArrowDown, BookOpen, Camera, Check, ChevronLeft, ChevronRight, Copy, CornerUpLeft, FileText, Heart, HelpCircle, Info, LayoutGrid, MessageCircle, Newspaper, Pencil, Pin, Plus, Search, Send, ShieldAlert, Smile, Sparkles, Sticker, Trash2, TrendingUp, Users, X } from "lucide-react";

// Community now renders the Ledger layout (Feed / Rooms / Ranks / Mentor). Set to false to bring back the old group chat UI.
const LEDGER_COMMUNITY = true;

export default function CommunityTab(props) {
  const {
    session,
    trades,
    REACTION_EMOJIS,
    activeGroupId,
    addingGroup,
    answerGroupQuestion,
    askGroupQuestion,
    avatarForAuthor,
    bioDraft,
    bioEditing,
    bioSaving,
    openEditProfile,
    profileExtras,
    claimCommunityUsername,
    closeProfileBack,
    commentDrafts,
    communityApiError,
    communityAvatar,
    communityAvatarUploading,
    communityFeedSubView,
    communityLobbyTab,
    communityMessagesEndRef,
    communityMobileFeedOpen,
    communityMsgText,
    communityPanelTab,
    communitySearch,
    communityUsername,
    communityUsernameBusy,
    communityUsernameDraft,
    communityUsernameError,
    createCommunityGroup,
    createCommunityPost,
    createFeedPost,
    createProfilePost,
    createStickerPack,
    createVaultItem,
    creatingGroup,
    deleteCommunityPost,
    deleteFeedComment,
    deleteFeedPost,
    deleteGroupQuestion,
    deleteProfileComment,
    deleteProfilePost,
    deleteSticker,
    deleteStickerPack,
    deleteVaultItem,
    deleteWallEntry,
    feedComments,
    feedCommentsLoading,
    feedCommentsOpenId,
    feedImageInputRef,
    feedImageUploading,
    fetchStickerPacks,
    followBusy,
    followListData,
    followListLoading,
    followListOpen,
    followListQuery,
    getCommunityMemberStats,
    globalFeed,
    globalFeedLoaded,
    groupAvatarMap,
    groupCodeError,
    groupFeed,
    groupFeedLoaded,
    groupInfo,
    groupMembersList,
    groupMessages,
    groupMessagesLoaded,
    groupPosts,
    groupPostsLoaded,
    groupQuestions,
    groupQuestionsLoaded,
    groupVault,
    groupVaultLoaded,
    groupWall,
    groupWallLoaded,
    handleCommunityAvatarChange,
    handleFeedImageChange,
    handlePostImageChange,
    handleProfilePostImageChange,
    handleStickerFileChange,
    isAuthorOnline,
    isDesktop,
    joinCodeError,
    joinCodeInput,
    joinGroupByCode,
    joiningGroup,
    leaderboardMetric,
    lightboxPost,
    likeGlobalFeedPost,
    likeProfilePost,
    likedFeedIds,
    loadGlobalFeed,
    loadMoreProfilePosts,
    myFeedReactions,
    myGroups,
    myWallIds,
    newFeedImage,
    newFeedPnl,
    newFeedText,
    newGroupCode,
    newGroupDesc,
    newGroupName,
    newGroupPublic,
    newGroupTags,
    newPostImage,
    newPostText,
    newQuestionText,
    newVaultText,
    newVaultTitle,
    newVaultUrl,
    newWallText,
    openCommunityMemberProfile,
    openFollowList,
    openGlobalFeedComments,
    pinCommunityMessage,
    pingTyping,
    pinnedMessageId,
    postFeedComment,
    postImageInputRef,
    postImageUploading,
    postProfileComment,
    postWallEntry,
    profileAvatarInputRef,
    profileCommentDraft,
    profileCommentInputRef,
    profileCommentSending,
    profileComments,
    profileCommentsLoading,
    profileComposerOpen,
    profileData,
    profileEmojiOpen,
    profileError,
    profileLoading,
    profileOpen,
    profilePostImage,
    profilePostImageInputRef,
    profilePostImageUploading,
    profilePostMenuOpen,
    profilePostOpen,
    profilePostSubmitting,
    profilePostText,
    profilePosts,
    profilePostsLoaded,
    profilePostsNext,
    profileSubTab,
    profileView,
    qaOpenId,
    qaReplyDrafts,
    relateWallEntry,
    relatedWallIds,
    renderCommunitySearch,
    renderGlobalFeed,
    replyingTo,
    saveProfileBio,
    searchCommunity,
    sendCommunityMessage,
    sendSticker,
    setActiveGroupId,
    setAddingGroup,
    setBioDraft,
    setBioEditing,
    setCommentDrafts,
    setCommunityFeedSubView,
    setCommunityLobbyTab,
    setCommunityMobileFeedOpen,
    setCommunityMsgText,
    setCommunityOpenTabDropdown,
    setCommunityPanelTab,
    setCommunitySearch,
    setCommunityUsernameDraft,
    setCommunityUsernameError,
    setFollowListOpen,
    setFollowListQuery,
    setGroupCodeError,
    setGroupManageOpen,
    setGroupManageTab,
    setJoinCodeError,
    setJoinCodeInput,
    setLeaderboardMetric,
    setLightboxPost,
    setManageDescDraft,
    setManageMsg,
    setManageNameDraft,
    setNewFeedImage,
    setNewFeedPnl,
    setNewFeedText,
    setNewGroupCode,
    setNewGroupDesc,
    setNewGroupName,
    setNewGroupPublic,
    setNewGroupTags,
    setNewPostImage,
    setNewPostText,
    setNewQuestionText,
    setNewVaultText,
    setNewVaultTitle,
    setNewVaultUrl,
    setNewWallText,
    setPendingDeleteMsg,
    setProfileCommentDraft,
    setProfileComposerOpen,
    setProfileEmojiOpen,
    setProfilePostImage,
    setProfilePostMenuOpen,
    setProfilePostOpen,
    setProfilePostText,
    setProfileSubTab,
    setQaOpenId,
    setQaReplyDrafts,
    setReplyingTo,
    setStickerActivePackId,
    setStickerManageMode,
    setStickerNewPackName,
    setStickerPickerOpen,
    stickerActivePackId,
    stickerError,
    stickerFileInputRef,
    stickerManageMode,
    stickerNewPackName,
    stickerPacks,
    stickerPacksLoaded,
    stickerPickerOpen,
    stickerUploading,
    toggleFeedComments,
    toggleFeedReaction,
    toggleFollowMember,
    toggleMessageReaction,
    typingUsers,
    unpinCommunityMessage,
    uploadProfilePostImage
  } = props;
  // chat-only UI state (selected message, jump-to-latest button, composer height)
  const [activeMsgId, setActiveMsgId] = useState(null);
  const [hmSel, setHmSel] = useState(-1);
  const [copiedProfile, setCopiedProfile] = useState(false);
  const [pvt, setPvt] = useState(() => {
    try { const s = JSON.parse(localStorage.getItem("ledger-profile-privacy") || "null"); if (Array.isArray(s) && s.length === 3) return s; } catch (e) {}
    return [true, true, true];
  });
  const togglePvt = (i) => setPvt((cur) => {
    const n = cur.map((v, k) => (k === i ? !v : v));
    try { localStorage.setItem("ledger-profile-privacy", JSON.stringify(n)); } catch (e) {}
    return n;
  });
  const [showJump, setShowJump] = useState(false);
  const composerRef = useRef(null);
  const swipe = useRef({ x: 0, y: 0, id: null });
  useEffect(() => {
    const el = composerRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [communityMsgText]);
  useEffect(() => { setActiveMsgId(null); }, [activeGroupId, communityPanelTab]);
  let body = null;
  const listTime = (ts) => {
    if (!ts) return "";
    const d = new Date(ts), t = new Date(), y = new Date();
    y.setDate(t.getDate() - 1);
    if (d.toDateString() === t.toDateString()) return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    if (d.toDateString() === y.toDateString()) return "Yesterday";
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  // Global feed: the feed itself is drawn by renderGlobalFeed (parent). This wrapper adds no box of its own
  // (display: contents) and only lifts the centred max-width and the wide side padding around the posts.
  const renderGlobalFeedWide = () => (
    <div className="gf-wide" style={{ display: "contents" }}>
      <style>{`.gf-wide [style*="max-width"]:not(img):not(p):not(span){max-width:none!important}.gf-wide [class*="max-w-"]:not(img){max-width:none!important}.gf-wide [style*="overflow-y: auto"],.gf-wide [class*="overflow-y-auto"]{padding-left:12px!important;padding-right:12px!important}`}</style>
      {renderGlobalFeed()}
    </div>
  );

    // ---------- Reusable chat panel (used standalone on mobile, embedded in split view on desktop) ----------
  const renderChatPanel = (heightStyle) => {
  const group = myGroups.find((g) => g.id === activeGroupId);
  const myMember = groupMembersList.find((m) => m.username === communityUsername);
  const isGroupOwner = group?.role === "owner" || !!myMember?.isOwner;
  const chatMessages = groupMessages.filter((m) => m.type !== "signal");
  const NAME_COLORS = ["#E57373", "#F2A05B", "#E6C84F", "#6FCF97", "#56CCF2", "#7C9CFF", "#BB86FC", "#F78FB3"];
  const nameColor = (n) => NAME_COLORS[[...String(n)].reduce((acc, c) => acc + c.charCodeAt(0), 0) % NAME_COLORS.length];
  const dayLabel = (ts) => {
    const d = new Date(ts), t = new Date(), y = new Date();
    y.setDate(t.getDate() - 1);
    if (d.toDateString() === t.toDateString()) return "Today";
    if (d.toDateString() === y.toDateString()) return "Yesterday";
    return d.toLocaleDateString([], { month: "short", day: "numeric", year: d.getFullYear() !== t.getFullYear() ? "numeric" : undefined });
  };
  const clockTime = (ts) => new Date(ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const jumpTo = (id) => {
    const el = typeof document !== "undefined" && document.getElementById(`msg-${id}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    if (el.animate) el.animate([{ background: `${palette.gold}26` }, { background: "transparent" }], { duration: 1100 });
  };
  const isEmojiOnly = (t) => /^(?:\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*){1,3}$/u.test(String(t || "").replace(/\s/g, ""));
  const renderText = (t) => String(t).split(/(https?:\/\/[^\s]+)/g).map((part, i) => (
    /^https?:\/\//.test(part)
      ? <a key={i} href={part} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} style={{ color: "inherit", fontWeight: 600, textDecoration: "underline", textUnderlineOffset: "2px" }}>{part}</a>
      : part
  ));
  const onlineCount = groupMembersList.filter((x) => isAuthorOnline(x.username)).length;
  const memberTotal = groupInfo?.memberCount ?? groupMembersList.length ?? 0;
    return (
      <div className="flex flex-col h-full" style={heightStyle}>
        {/* Header */}
        {(() => {
          const openGroupInfo = () => {
            setManageNameDraft(group?.name || "");
            setManageDescDraft(group?.description || "");
            setManageMsg("");
            setGroupManageTab("info");
            setGroupManageOpen(true);
          };
          const typing = typingUsers.length > 0;
          const typingText = typingUsers.length === 1 ? `${typingUsers[0]} is typing…` : typingUsers.length === 2 ? `${typingUsers[0]} and ${typingUsers[1]} are typing…` : `${typingUsers.length} people are typing…`;
          return (
        <div
          className="flex items-center gap-2 flex-shrink-0"
          style={{
            padding: isDesktop ? "12px 18px" : "8px 10px 8px 6px",
            paddingTop: isDesktop ? undefined : "max(8px, env(safe-area-inset-top, 0px))",
            borderBottom: `1px solid ${palette.border}`,
            background: palette.surface,
            borderTopLeftRadius: isDesktop ? "16px" : 0,
            borderTopRightRadius: isDesktop ? "16px" : 0,
          }}
        >
          {!isDesktop && (
            <button type="button" onClick={() => setActiveGroupId(null)} className={`flex items-center justify-center rounded-full flex-shrink-0 ${TAP}`} style={{ width: "38px", height: "40px", background: "none", border: "none", color: palette.text }} aria-label="Back to groups">
              <ChevronLeft size={24} />
            </button>
          )}
          <button type="button" onClick={openGroupInfo} className={`flex items-center gap-3 flex-1 min-w-0 ${TAP}`} style={{ background: "none", border: "none", padding: 0, textAlign: "left" }} aria-label="View group info">
            <Avatar name={group ? group.name : "?"} size={isDesktop ? 44 : 40} src={groupAvatarMap[activeGroupId]} />
            <div className="flex-1 min-w-0">
              <div className="truncate" style={{ fontFamily: display, fontSize: isDesktop ? "16px" : "15.5px", fontWeight: 700, color: palette.text, lineHeight: 1.25 }}>
                {group ? group.name : "Group"}
              </div>
              <div className="truncate" style={{ color: typing ? palette.gold : palette.textFaint, fontSize: "12px", marginTop: "1px", fontFamily: sans }}>
                {typing ? typingText : `${memberTotal} member${memberTotal === 1 ? "" : "s"}${onlineCount > 0 ? ` · ${onlineCount} online` : ""}`}
              </div>
            </div>
          </button>
          <button type="button" onClick={openGroupInfo} className={`flex items-center justify-center rounded-full flex-shrink-0 ${TAP}`} style={{ width: "40px", height: "40px", background: "none", border: "none", color: palette.textMuted }} aria-label="Group info and members" title="Group info and members">
            <Info size={21} />
          </button>
        </div>
          );
        })()}

        {pinnedMessageId && (() => {
          const pinned = groupMessages.find((m) => m.id === pinnedMessageId);
          if (!pinned) return null;
          return (
            <div className="flex items-center gap-2.5 flex-shrink-0" style={{ padding: "7px 12px", background: palette.surface, borderBottom: `1px solid ${palette.border}` }}>
              <button type="button" onClick={() => jumpTo(pinned.id)} className={`flex items-center gap-2.5 flex-1 min-w-0 ${TAP}`} style={{ background: "none", border: "none", padding: 0, textAlign: "left" }} aria-label="Go to pinned message">
                <span style={{ width: "3px", alignSelf: "stretch", borderRadius: "3px", background: palette.gold, flexShrink: 0 }} />
                <div className="flex-1 min-w-0">
                  <div style={{ color: palette.gold, fontSize: "11.5px", fontWeight: 700 }}>Pinned message</div>
                  <div className="truncate" style={{ color: palette.textMuted, fontSize: "12.5px" }}>{pinned.type === "sticker" ? "Sticker" : pinned.text}</div>
                </div>
                <Pin size={14} style={{ color: palette.textFaint, flexShrink: 0 }} />
              </button>
              {isGroupOwner && (
                <button type="button" onClick={unpinCommunityMessage} className={TAP} style={{ color: palette.textFaint, flexShrink: 0 }} aria-label="Unpin">
                  <X size={15} />
                </button>
              )}
            </div>
          );
        })()}

{(() => {
          // ── Group navigation ──────────────────────────────────────────
          // Top level: Instagram-style underline tabs (one scrollable row, no wrapping).
          // Second level: Discord-style channel switcher for tabs that have sub-views.
          const ICONS = {
            chat: <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />,
            image: (<><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-3.09-3.09a2 2 0 0 0-2.82 0L6 21" /></>),
            megaphone: (<><path d="m3 11 18-5v12L3 14v-3z" /><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" /></>),
            help: (<><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><path d="M12 17h.01" /></>),
            folder: <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />,
            trophy: (<><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" /></>),
            hash: (<><path d="M4 9h16" /><path d="M4 15h16" /><path d="M10 3 8 21" /><path d="M16 3l-2 18" /></>),
            grid: (<><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /></>),
            bulb: (<><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" /><path d="M9 18h6" /><path d="M10 22h4" /></>),
            note: (<><path d="M15.5 3H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3Z" /><path d="M15 3v6h6" /></>),
          };
          const icon = (name, size, color) => (
            <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
              {ICONS[name]}
            </svg>
          );

          const TAB_GROUPS = [
            { id: "chat", label: "Chat", icon: "chat" },
            { id: "feed", label: "Feed", icon: "image",
              subs: [{ id: "feed", label: "Posts", icon: "grid" }, { id: "wall", label: "Wall", icon: "note" }],
              subState: communityFeedSubView, setSubState: setCommunityFeedSubView },
            { id: "posts", label: "Announcements", icon: "megaphone" },
            { id: "qa", label: "Q&A", icon: "help" },
            { id: "vault", label: "Resources", icon: "folder" },
            { id: "leaderboard", label: "Leaderboard", icon: "trophy" },
          ];
          const activeGroup = TAB_GROUPS.find((g) => g.id === communityPanelTab || (g.subs && g.subs.some((s) => s.id === communityPanelTab))) || TAB_GROUPS[0];

          const openTab = (g, e) => {
            setCommunityPanelTab(g.subs ? (g.subState || g.subs[0].id) : g.id);
            setCommunityOpenTabDropdown(null);
            if (e && e.currentTarget && e.currentTarget.scrollIntoView) {
              e.currentTarget.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
            }
          };

          return (
            <>
              <style>{`.comm-tabbar{scrollbar-width:none;-ms-overflow-style:none}.comm-tabbar::-webkit-scrollbar{display:none}`}</style>

              {/* Level 1: pill tabs */}
              <div
                className="comm-tabbar flex flex-shrink-0"
                role="tablist"
                aria-label="Group sections"
                style={{ overflowX: "auto", gap: "6px", padding: isDesktop ? "10px 16px" : "8px 12px", background: palette.surface, borderBottom: `1px solid ${palette.border}` }}
              >
                {TAB_GROUPS.map((g) => {
                  const active = g.id === activeGroup.id;
                  return (
                    <button
                      key={g.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={(e) => openTab(g, e)}
                      className={TAP}
                      style={{
                        flexShrink: 0, whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: "6px",
                        height: "32px", padding: "0 13px", borderRadius: "999px",
                        background: active ? `${palette.gold}1f` : "transparent",
                        border: `1px solid ${active ? `${palette.gold}66` : "transparent"}`,
                        color: active ? palette.text : palette.textMuted,
                        fontFamily: sans, fontSize: "12.5px", fontWeight: active ? 700 : 600,
                        transition: "background 0.15s, color 0.15s, border-color 0.15s",
                      }}
                    >
                      {icon(g.icon, 14, active ? palette.gold : palette.textFaint)}
                      {g.label}
                    </button>
                  );
                })}
              </div>

              {/* Level 2: channel switcher (only for tabs with sub-views) */}
              {activeGroup.subs && (
                <div className="flex flex-shrink-0" style={{ padding: isDesktop ? "10px 16px 4px" : "8px 12px 2px" }}>
                  <div
                    role="tablist"
                    aria-label={`${activeGroup.label} views`}
                    style={{ display: "inline-flex", gap: "2px", padding: "3px", borderRadius: "12px", background: palette.letterbox, border: `1px solid ${palette.border}` }}
                  >
                    {activeGroup.subs.map((s) => {
                      const on = communityPanelTab === s.id;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          role="tab"
                          aria-selected={on}
                          onClick={() => { activeGroup.setSubState(s.id); setCommunityPanelTab(s.id); }}
                          className={TAP}
                          style={{
                            display: "flex", alignItems: "center", gap: "6px",
                            padding: "5px 12px", borderRadius: "9px", whiteSpace: "nowrap",
                            border: "none",
                            background: on ? palette.field : "transparent",
                            boxShadow: on ? "0 1px 3px rgba(0,0,0,0.25)" : "none",
                            color: on ? palette.text : palette.textMuted,
                            fontFamily: sans, fontSize: "12px", fontWeight: on ? 700 : 600,
                            transition: "background 0.15s, color 0.15s",
                          }}
                        >
                          {icon(s.icon, 13, on ? palette.gold : palette.textFaint)}
                          {s.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          );
        })()}

        {communityPanelTab === "posts" ? (
          <>
            <div className="flex-1 px-4 py-4" style={{ overflowY: "auto", minHeight: 0, background: palette.bg }}>
              {isGroupOwner && (
                <div className="rounded-2xl p-3 mb-4" style={{ background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow }}>
                  <textarea
                    value={newPostText}
                    onChange={(e) => setNewPostText(e.target.value)}
                    placeholder="Write an announcement for the group…"
                    rows={3}
                    className="w-full bg-transparent outline-none mb-2"
                    style={{ color: palette.text, fontSize: "13px", resize: "none" }}
                  />
                  {newPostImage && (
                    <div className="relative inline-block mb-2">
                      <img src={newPostImage} alt="Post attachment" className="rounded-lg" style={{ width: "96px", height: "96px", objectFit: "cover", border: `1px solid ${palette.border}` }} />
                      <button type="button" onClick={() => setNewPostImage(null)} className={`absolute flex items-center justify-center rounded-full ${TAP}`} style={{ top: "-6px", right: "-6px", width: "18px", height: "18px", background: palette.red, color: "#FFFFFF" }} aria-label="Remove image">
                        <X size={11} />
                      </button>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => postImageInputRef.current && postImageInputRef.current.click()}
                      disabled={postImageUploading}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${TAP}`}
                      style={{ background: palette.field, border: `1px solid ${palette.border}`, color: palette.textMuted, fontSize: "11.5px", fontFamily: mono }}
                    >
                      <Camera size={13} />
                      {postImageUploading ? "Uploading…" : "Add photo"}
                    </button>
                    <button
                      type="button"
                      onClick={createCommunityPost}
                      disabled={!newPostText.trim() && !newPostImage}
                      className={`px-4 py-1.5 rounded-lg ${TAP}`}
                      style={{
                        background: (newPostText.trim() || newPostImage) ? palette.gold : palette.border,
                        color: (newPostText.trim() || newPostImage) ? palette.letterbox : palette.textFaint,
                        fontFamily: mono, fontSize: "12px", fontWeight: 700,
                      }}
                    >
                      Post
                    </button>
                  </div>
                  <input ref={postImageInputRef} type="file" accept="image/*" onChange={handlePostImageChange} style={{ display: "none" }} />
                </div>
              )}

              {!groupPostsLoaded ? (
                <p className="text-xs" style={{ color: palette.textFaint }}>Loading announcements…</p>
              ) : groupPosts.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-10">
                  <span className="flex items-center justify-center rounded-full mb-3" style={{ width: "48px", height: "48px", background: `${palette.gold}14`, border: `1px solid ${palette.gold}33` }}>
                    <FileText size={20} style={{ color: palette.gold }} />
                  </span>
                  <p className="text-xs" style={{ color: palette.textFaint, maxWidth: "240px" }}>
                    {isGroupOwner ? "Post an update for the group above." : "No announcements yet."}
                  </p>
                </div>
              ) : (
                groupPosts.map((p) => (
                  <div key={p.id} className="rounded-2xl p-4 mb-3" style={{ background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow }}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Avatar name={p.author} size={26} src={groupAvatarMap[activeGroupId]} />
                        <button type="button" onClick={() => openCommunityMemberProfile(p.author)} className={TAP} style={{ color: palette.gold, fontSize: "12px", fontWeight: 700, background: "none", border: "none", padding: 0 }}><PlanName name={p.author} /></button>
                        <span style={{ color: palette.textFaint, fontSize: "10.5px", fontFamily: mono }}>
                          {new Date(p.ts).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      {isGroupOwner && (
                        <button type="button" onClick={() => deleteCommunityPost(p.id)} className={TAP} style={{ color: palette.textFaint }} aria-label="Delete post">
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                    {p.text && <p className="text-sm mb-2" style={{ color: palette.text, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{p.text}</p>}
                    {p.image && <img src={p.image} alt="Post attachment" className="rounded-xl w-full" style={{ maxHeight: "320px", objectFit: "cover", border: `1px solid ${palette.border}` }} />}
                  </div>
                ))
              )}
            </div>
          </>

        ) : communityPanelTab === "qa" ? (
          <>
            <div className="flex-1 px-4 py-4" style={{ overflowY: "auto", minHeight: 0, background: palette.bg }}>
              <div className="rounded-2xl p-3.5 mb-4" style={{ background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow }}>
                <textarea value={newQuestionText} onChange={(e) => setNewQuestionText(e.target.value)}
                  placeholder="Ask the group something…" rows={2}
                  className="w-full bg-transparent outline-none mb-2"
                  style={{ color: palette.text, fontSize: "13px", resize: "none" }} />
                <div className="flex justify-end">
                  <button type="button" onClick={askGroupQuestion} disabled={!newQuestionText.trim()}
                    className={`px-4 py-1.5 rounded-lg ${TAP}`}
                    style={{
                      background: newQuestionText.trim() ? palette.gold : palette.border,
                      color: newQuestionText.trim() ? palette.letterbox : palette.textFaint,
                      fontFamily: mono, fontSize: "12px", fontWeight: 700,
                    }}>
                    Ask
                  </button>
                </div>
              </div>

              {!groupQuestionsLoaded ? (
                <p className="text-xs" style={{ color: palette.textFaint }}>Loading questions…</p>
              ) : groupQuestions.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-10">
                  <span className="flex items-center justify-center rounded-full mb-3" style={{ width: "48px", height: "48px", background: `${palette.gold}14`, border: `1px solid ${palette.gold}33` }}>
                    <HelpCircle size={20} style={{ color: palette.gold }} />
                  </span>
                  <p className="text-xs" style={{ color: palette.textFaint, maxWidth: "240px" }}>
                    No questions yet. Ask something above — keeps troubleshooting out of the main chat.
                  </p>
                </div>
              ) : (
                groupQuestions.map((q) => {
                  const isOpen = qaOpenId === q.id;
                  const canDelete = q.author === communityUsername || isGroupOwner;
                  return (
                    <div key={q.id} className="rounded-2xl p-3.5 mb-3" style={{ background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow }}>
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <button type="button" onClick={() => setQaOpenId(isOpen ? null : q.id)} className={`flex-1 min-w-0 text-left ${TAP}`}>
                          <p className="text-sm" style={{ color: palette.text, fontWeight: 600, lineHeight: 1.4 }}>{q.text}</p>
                        </button>
                        {canDelete && (
                          <button type="button" onClick={() => deleteGroupQuestion(q.id)} className={TAP} style={{ color: palette.textFaint, flexShrink: 0 }} aria-label="Delete question">
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <span style={{ color: palette.textFaint, fontSize: "10.5px", fontFamily: mono }}>asked by <button type="button" onClick={() => openCommunityMemberProfile(q.author)} className={TAP} style={{ color: palette.gold, background: "none", border: "none", padding: 0, font: "inherit" }}><PlanName name={q.author} /></button></span>
                        <button type="button" onClick={() => setQaOpenId(isOpen ? null : q.id)} className={TAP} style={{ color: palette.gold, fontSize: "10.5px", fontFamily: mono, fontWeight: 700 }}>
                          {q.answers.length} answer{q.answers.length === 1 ? "" : "s"}
                        </button>
                      </div>
                      {isOpen && (
                        <div style={{ borderTop: `1px solid ${palette.border}`, paddingTop: "10px" }}>
                          {q.answers.map((a, i) => (
                            <div key={i} className="flex items-start gap-2 mb-2">
                              <Avatar name={a.author} size={18} src={avatarForAuthor(a.author)} />
                              <div className="min-w-0">
                                <button type="button" onClick={() => openCommunityMemberProfile(a.author)} className={TAP} style={{ color: palette.textMuted, fontSize: "11px", fontWeight: 700, marginRight: "6px", background: "none", border: "none", padding: 0 }}><PlanName name={a.author} /></button>
                                <span style={{ color: palette.text, fontSize: "12.5px" }}>{a.text}</span>
                              </div>
                            </div>
                          ))}
                          <div className="flex items-center gap-2 mt-2">
                            <input type="text" value={qaReplyDrafts[q.id] || ""} onChange={(e) => setQaReplyDrafts((cur) => ({ ...cur, [q.id]: e.target.value }))}
                              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); answerGroupQuestion(q.id); } }}
                              placeholder="Write an answer…"
                              className="flex-1 rounded-lg px-3 py-2 bg-transparent outline-none"
                              style={{ background: palette.field, border: `1px solid ${palette.border}`, color: palette.text, fontSize: "12.5px" }} />
                            <button type="button" onClick={() => answerGroupQuestion(q.id)} disabled={!(qaReplyDrafts[q.id] || "").trim()}
                              className={`flex items-center justify-center rounded-full flex-shrink-0 ${TAP}`}
                              style={{ width: "32px", height: "32px", background: palette.gold, color: palette.letterbox, opacity: (qaReplyDrafts[q.id] || "").trim() ? 1 : 0.5 }}
                              aria-label="Send answer">
                              <Send size={13} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
              <p className="text-xs text-center mt-2" style={{ color: palette.textFaint }}>Questions are shared with this group.</p>
            </div>
          </>

        ) : communityPanelTab === "vault" ? (
          <>
            <div className="flex-1 px-4 py-4" style={{ overflowY: "auto", minHeight: 0, background: palette.bg }}>
              <div className="rounded-2xl p-3.5 mb-4" style={{ background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow }}>
                <input type="text" value={newVaultTitle} onChange={(e) => setNewVaultTitle(e.target.value)} placeholder="Title (e.g. Pre-trade checklist)"
                  className="w-full rounded-xl px-3 py-2 bg-transparent outline-none mb-2.5"
                  style={{ background: palette.field, border: `1px solid ${palette.border}`, color: palette.text, fontSize: "13px" }} />
                <input type="text" value={newVaultUrl} onChange={(e) => setNewVaultUrl(e.target.value)} placeholder="Link (optional)"
                  className="w-full rounded-xl px-3 py-2 bg-transparent outline-none mb-2.5"
                  style={{ background: palette.field, border: `1px solid ${palette.border}`, color: palette.text, fontFamily: mono, fontSize: "12.5px" }} />
                <textarea value={newVaultText} onChange={(e) => setNewVaultText(e.target.value)}
                  placeholder="What is this and when should the group use it?" rows={2}
                  className="w-full bg-transparent outline-none mb-2"
                  style={{ color: palette.text, fontSize: "13px", resize: "none" }} />
                <div className="flex justify-end">
                  <button type="button" onClick={createVaultItem} disabled={!newVaultTitle.trim()}
                    className={`px-4 py-1.5 rounded-lg ${TAP}`}
                    style={{
                      background: newVaultTitle.trim() ? palette.gold : palette.border,
                      color: newVaultTitle.trim() ? palette.letterbox : palette.textFaint,
                      fontFamily: mono, fontSize: "12px", fontWeight: 700,
                    }}>
                    Add to resources
                  </button>
                </div>
              </div>

              {!groupVaultLoaded ? (
                <p className="text-xs" style={{ color: palette.textFaint }}>Loading resources…</p>
              ) : groupVault.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-10">
                  <span className="flex items-center justify-center rounded-full mb-3" style={{ width: "48px", height: "48px", background: `${palette.gold}14`, border: `1px solid ${palette.gold}33` }}>
                    <BookOpen size={20} style={{ color: palette.gold }} />
                  </span>
                  <p className="text-xs" style={{ color: palette.textFaint, maxWidth: "240px" }}>
                    No resources yet. Add a checklist, strategy doc, or reference link above — it stays pinned here, separate from the chatter in Chat and Feed.
                  </p>
                </div>
              ) : (
                groupVault.map((item) => {
                  const canDelete = item.author === communityUsername || isGroupOwner;
                  return (
                    <div key={item.id} className="rounded-2xl p-3.5 mb-3 flex items-start gap-3" style={{ background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow }}>
                      <span className="flex items-center justify-center rounded-lg flex-shrink-0" style={{ width: "34px", height: "34px", background: palette.field, color: palette.gold }}>
                        <BookOpen size={16} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          {item.url ? (
                            <a href={item.url} target="_blank" rel="noreferrer" style={{ color: palette.text, fontSize: "13.5px", fontWeight: 700, textDecoration: "none" }}>
                              {item.title}
                            </a>
                          ) : (
                            <span style={{ color: palette.text, fontSize: "13.5px", fontWeight: 700 }}>{item.title}</span>
                          )}
                          {canDelete && (
                            <button type="button" onClick={() => deleteVaultItem(item.id)} className={TAP} style={{ color: palette.textFaint, flexShrink: 0 }} aria-label="Remove from vault">
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                        {item.text && <p className="text-sm mt-1" style={{ color: palette.textMuted, lineHeight: 1.5 }}>{item.text}</p>}
                        <div className="mt-1.5" style={{ color: palette.textFaint, fontSize: "10px", fontFamily: mono }}>
                          Added by {item.author}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <p className="text-xs text-center mt-2" style={{ color: palette.textFaint }}>Resources are shared with this group.</p>
            </div>
          </>

        ) : communityPanelTab === "wall" ? (
          <>
            <div className="flex-1 px-4 py-4" style={{ overflowY: "auto", minHeight: 0, background: palette.bg }}>
              <div className="rounded-2xl p-3.5 mb-4" style={{ background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow }}>
                <textarea value={newWallText} onChange={(e) => setNewWallText(e.target.value)}
                  placeholder="Admit a mistake — oversized, moved a stop, revenge trade…" rows={2}
                  className="w-full bg-transparent outline-none mb-2"
                  style={{ color: palette.text, fontSize: "13px", resize: "none" }} />
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5" style={{ color: palette.textFaint, fontSize: "10.5px", fontFamily: mono }}>
                    <ShieldAlert size={12} /> Posted anonymously
                  </span>
                  <button type="button" onClick={postWallEntry} disabled={!newWallText.trim()}
                    className={`px-4 py-1.5 rounded-lg ${TAP}`}
                    style={{
                      background: newWallText.trim() ? palette.gold : palette.border,
                      color: newWallText.trim() ? palette.letterbox : palette.textFaint,
                      fontFamily: mono, fontSize: "12px", fontWeight: 700,
                    }}>
                    Post anonymously
                  </button>
                </div>
              </div>

              {!groupWallLoaded ? (
                <p className="text-xs" style={{ color: palette.textFaint }}>Loading the wall…</p>
              ) : groupWall.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-10">
                  <span className="flex items-center justify-center rounded-full mb-3" style={{ width: "48px", height: "48px", background: `${palette.gold}14`, border: `1px solid ${palette.gold}33` }}>
                    <AlertTriangle size={20} style={{ color: palette.gold }} />
                  </span>
                  <p className="text-xs" style={{ color: palette.textFaint, maxWidth: "240px" }}>
                    Nothing here yet. Nobody sees who posts what — it's a place to admit a mistake without the status cost.
                  </p>
                </div>
              ) : (
                groupWall.map((entry) => {
                  const canDelete = isGroupOwner || myWallIds.includes(entry.id);
                  const related = relatedWallIds.includes(entry.id);
                  return (
                    <div key={entry.id} className="rounded-2xl p-3.5 mb-3" style={{ background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow }}>
                      <p className="text-sm mb-2.5" style={{ color: palette.text, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{entry.text}</p>
                      <div className="flex items-center justify-between">
                        <span style={{ color: palette.textFaint, fontSize: "10px", fontFamily: mono }}>
                          {new Date(entry.ts).toLocaleDateString([], { month: "short", day: "numeric" })}
                        </span>
                        <div className="flex items-center gap-3">
                          <button type="button" onClick={() => relateWallEntry(entry.id)} disabled={related} className={TAP}
                            style={{ color: related ? palette.gold : palette.textFaint, fontSize: "11px", fontFamily: mono, background: "none", border: "none", padding: 0 }}>
                            🤝 {entry.relateCount || 0} relate
                          </button>
                          {canDelete && (
                            <button type="button" onClick={() => deleteWallEntry(entry.id)} className={TAP} style={{ color: palette.textFaint }} aria-label="Remove entry">
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <p className="text-xs text-center mt-2" style={{ color: palette.textFaint }}>Entries are anonymous to other members — only you and the group owner can remove your own.</p>
            </div>
          </>

        ) : communityPanelTab === "feed" ? (
          <>
            <div className="flex-1 px-4 py-4" style={{ overflowY: "auto", minHeight: 0, background: palette.bg }}>

              <div className="rounded-2xl p-3.5 mb-4" style={{ background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow }}>
                <textarea value={newFeedText} onChange={(e) => setNewFeedText(e.target.value)}
                  placeholder="Share a trade with the group…" rows={2}
                  className="w-full bg-transparent outline-none mb-2"
                  style={{ color: palette.text, fontSize: "13px", resize: "none" }} />
                <input type="text" value={newFeedPnl} onChange={(e) => setNewFeedPnl(e.target.value)} placeholder="Result (optional, e.g. +2.4R)"
                  className="w-full rounded-xl px-3 py-2 bg-transparent outline-none mb-2"
                  style={{ background: palette.field, border: `1px solid ${palette.border}`, color: palette.text, fontFamily: mono, fontSize: "12.5px" }} />
                {newFeedImage && (
                  <div className="relative inline-block mb-2">
                    <img src={newFeedImage} alt="Feed attachment" className="rounded-lg" style={{ width: "96px", height: "96px", objectFit: "cover", border: `1px solid ${palette.border}` }} />
                    <button type="button" onClick={() => setNewFeedImage(null)} className={`absolute flex items-center justify-center rounded-full ${TAP}`} style={{ top: "-6px", right: "-6px", width: "18px", height: "18px", background: palette.red, color: "#FFFFFF" }} aria-label="Remove image">
                      <X size={11} />
                    </button>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => feedImageInputRef.current && feedImageInputRef.current.click()}
                    disabled={feedImageUploading}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${TAP}`}
                    style={{ background: palette.field, border: `1px solid ${palette.border}`, color: palette.textMuted, fontSize: "11.5px", fontFamily: mono }}
                  >
                    <Camera size={13} />
                    {feedImageUploading ? "Uploading…" : "Add screenshot"}
                  </button>
                  <button type="button" onClick={createFeedPost}
                    disabled={!newFeedText.trim() && !newFeedImage}
                    className={`px-4 py-1.5 rounded-lg ${TAP}`}
                    style={{
                      background: (newFeedText.trim() || newFeedImage) ? palette.gold : palette.border,
                      color: (newFeedText.trim() || newFeedImage) ? palette.letterbox : palette.textFaint,
                      fontFamily: mono, fontSize: "12px", fontWeight: 700,
                    }}>
                    Share
                  </button>
                </div>
                <input ref={feedImageInputRef} type="file" accept="image/*" onChange={handleFeedImageChange} style={{ display: "none" }} />
              </div>

              {!groupFeedLoaded ? (
                <p className="text-xs" style={{ color: palette.textFaint }}>Loading feed…</p>
              ) : groupFeed.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-10">
                  <span className="flex items-center justify-center rounded-full mb-3" style={{ width: "48px", height: "48px", background: `${palette.gold}14`, border: `1px solid ${palette.gold}33` }}>
                    <Newspaper size={20} style={{ color: palette.gold }} />
                  </span>
                  <p className="text-xs" style={{ color: palette.textFaint, maxWidth: "240px" }}>
                    No activity yet. Share a trade you closed — a quick note is enough, the result tag is optional.
                  </p>
                </div>
              ) : (
                groupFeed.map((p) => {
                  const canDelete = p.author === communityUsername || isGroupOwner;
                  const liked = likedFeedIds.includes(p.id);
                  const pnlPositive = p.pnl && !p.pnl.trim().startsWith("-");
                  return (
                    <div key={p.id} className="rounded-2xl p-4 mb-3.5" style={{ background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow }}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <Avatar name={p.author} size={isDesktop ? 38 : 34} src={avatarForAuthor(p.author)} />
                          <div className="min-w-0">
                            <button type="button" onClick={() => openCommunityMemberProfile(p.author)} className={`block ${TAP}`} style={{ color: palette.text, fontSize: "13.5px", fontWeight: 700, background: "none", border: "none", padding: 0, textAlign: "left" }}>
                              <PlanName name={p.author} />
                            </button>
                            <span style={{ color: palette.textFaint, fontSize: "11px", fontFamily: mono }}>
                              {feedTimeAgo(p.ts)}
                            </span>
                          </div>
                        </div>
                        {canDelete && (
                          <button type="button" onClick={() => deleteFeedPost(p.id)} className={`flex-shrink-0 ${TAP}`} style={{ color: palette.textFaint }} aria-label="Delete post">
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                      {p.text && <p className="text-sm mb-2.5" style={{ color: palette.text, lineHeight: 1.55, whiteSpace: "pre-wrap" }}>{p.text}</p>}
                      {p.pnl && (
                        <span className="inline-block mb-2.5" style={{
                          background: pnlPositive ? `${palette.green}1c` : `${palette.red}1c`,
                          color: pnlPositive ? palette.green : palette.red,
                          border: `1px solid ${pnlPositive ? palette.green : palette.red}44`,
                          fontSize: "11.5px", fontWeight: 700, padding: "4px 11px", borderRadius: "999px", fontFamily: mono,
                        }}>{p.pnl}</span>
                      )}
                      {p.image && <img src={p.image} alt="Feed attachment" className="rounded-xl w-full mb-2.5" style={{ maxHeight: "320px", objectFit: "cover", border: `1px solid ${palette.border}` }} />}
                      <div className="flex items-center gap-1.5 pt-1 flex-wrap" style={{ borderTop: `1px solid ${palette.border}`, marginTop: "2px", paddingTop: "10px" }}>
                        {FEED_REACTIONS.map((r) => {
                          const count = (p.reactions && p.reactions[r.key]) || 0;
                          const active = myFeedReactions[p.id] === r.key;
                          return (
                            <button
                              key={r.key}
                              type="button"
                              onClick={() => toggleFeedReaction(p.id, r.key)}
                              className={`flex items-center gap-1 ${TAP}`}
                              style={{
                                color: active ? palette.gold : palette.textFaint,
                                fontSize: "12px", fontFamily: mono, fontWeight: 700,
                                background: active ? `${palette.gold}14` : "transparent",
                                border: `1px solid ${active ? `${palette.gold}44` : "transparent"}`,
                                borderRadius: "999px", padding: "3px 7px",
                              }}
                              aria-label={active ? `Remove ${r.key} reaction` : `React with ${r.key}`}
                            >
                              <span style={{ fontSize: "13px" }}>{r.emoji}</span>{count > 0 && count}
                            </button>
                          );
                        })}
                        <button
                          type="button"
                          onClick={() => toggleFeedComments(p.id)}
                          className={`flex items-center gap-1 ml-auto ${TAP}`}
                          style={{ color: feedCommentsOpenId === p.id ? palette.gold : palette.textFaint, fontSize: "12px", fontFamily: mono, fontWeight: 700, background: "none", border: "none", padding: "3px 7px" }}
                        >
                          💬 {p.commentCount != null ? p.commentCount : (feedComments[p.id]?.length || 0)}
                        </button>
                      </div>

                      {feedCommentsOpenId === p.id && (
                        <div className="mt-2.5 pt-2.5" style={{ borderTop: `1px solid ${palette.border}` }}>
                          {feedCommentsLoading[p.id] ? (
                            <p className="text-xs" style={{ color: palette.textFaint }}>Loading comments…</p>
                          ) : (feedComments[p.id] || []).length === 0 ? (
                            <p className="text-xs mb-2" style={{ color: palette.textFaint }}>No comments yet — be the first to reply.</p>
                          ) : (
                            (feedComments[p.id] || []).map((c) => {
                              const canDeleteComment = c.author === communityUsername || isGroupOwner;
                              return (
                                <div key={c.id} className="flex items-start gap-2 mb-2">
                                  <Avatar name={c.author} size={22} src={avatarForAuthor(c.author)} />
                                  <div className="flex-1 min-w-0 rounded-xl px-2.5 py-1.5" style={{ background: palette.field, border: `1px solid ${palette.border}` }}>
                                    <div className="flex items-center gap-1.5">
                                      <span style={{ color: palette.text, fontSize: "11.5px", fontWeight: 700 }}><PlanName name={c.author} /></span>
                                      <span style={{ color: palette.textFaint, fontSize: "9.5px", fontFamily: mono }}>{feedTimeAgo(c.ts)}</span>
                                    </div>
                                    <p className="text-xs" style={{ color: palette.textMuted, whiteSpace: "pre-wrap" }}>{c.text}</p>
                                  </div>
                                  {canDeleteComment && (
                                    <button type="button" onClick={() => deleteFeedComment(p.id, c.id)} className={`flex-shrink-0 ${TAP}`} style={{ color: palette.textFaint }} aria-label="Delete comment">
                                      <Trash2 size={11} />
                                    </button>
                                  )}
                                </div>
                              );
                            })
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <input
                              type="text"
                              value={commentDrafts[p.id] || ""}
                              onChange={(e) => setCommentDrafts((cur) => ({ ...cur, [p.id]: e.target.value }))}
                              onKeyDown={(e) => { if (e.key === "Enter") postFeedComment(p.id); }}
                              placeholder="Write a comment…"
                              className="flex-1 rounded-lg px-2.5 py-1.5 bg-transparent outline-none"
                              style={{ background: palette.field, border: `1px solid ${palette.border}`, color: palette.text, fontSize: "12px" }}
                            />
                            <button
                              type="button"
                              onClick={() => postFeedComment(p.id)}
                              disabled={!(commentDrafts[p.id] || "").trim()}
                              className={TAP}
                              style={{ color: (commentDrafts[p.id] || "").trim() ? palette.gold : palette.textFaint, background: "none", border: "none", padding: "4px" }}
                              aria-label="Send comment"
                            >
                              <Send size={15} />
                            </button>
                          </div>
                          {communityApiError && <p className="text-xs mt-1.5" style={{ color: palette.red }}>{communityApiError}</p>}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
              <p className="text-xs text-center mt-2" style={{ color: palette.textFaint }}>Feed posts are shared with this group.</p>
            </div>
          </>

        ) : communityPanelTab === "leaderboard" ? (
          <>
            {(() => {
              const members = groupMembersList.length ? groupMembersList : (communityUsername ? [{ username: communityUsername, avatar: communityAvatar }] : []);
              const rows = members.map((member) => ({ member, stats: getCommunityMemberStats(member) }));
              const valueFor = (row) => {
                const v = row.stats[leaderboardMetric];
                return Number.isFinite(v) ? v : null;
              };
              rows.sort((a, b) => {
                const av = valueFor(a), bv = valueFor(b);
                if (av === null && bv === null) return 0;
                if (av === null) return 1;
                if (bv === null) return -1;
                return bv - av;
              });
              const top = rows.slice(0, 3);
              const rest = rows.slice(3);
              const metricText = (stats) => {
                const v = stats[leaderboardMetric];
                if (!Number.isFinite(v)) return "—";
                if (leaderboardMetric === "winRate" || leaderboardMetric === "pnlPct") return `${v >= 0 && leaderboardMetric === "pnlPct" ? "+" : ""}${v.toFixed(0)}%`;
                return `${v}`;
              };
              const podium = top.length === 3 ? [top[1], top[0], top[2]] : top;
              return (
                <div className="flex-1 px-4 py-4 overflow-y-auto" style={{ minHeight: 0, background: palette.bg }}>
                  <div className="flex items-center gap-2 mb-4" style={{ overflowX: "auto", scrollbarWidth: "none" }}>
                    {[{ id: "winRate", label: "Win rate" }, { id: "pnlPct", label: "P&L %" }, { id: "streak", label: "Streak" }].map((t) => (
                      <button key={t.id} type="button" onClick={() => setLeaderboardMetric(t.id)} className={`px-3 py-1.5 rounded-full flex-shrink-0 ${TAP}`} style={{ background: leaderboardMetric === t.id ? palette.gold : palette.field, color: leaderboardMetric === t.id ? palette.letterbox : palette.textMuted, border: `1px solid ${leaderboardMetric === t.id ? palette.gold : palette.border}`, fontFamily: sans, fontSize: "11px", fontWeight: 700 }}>{t.label}</button>
                    ))}
                    <span className="flex-1" />
                    <span style={{ color: palette.textFaint, fontSize: "10.5px", fontFamily: mono, whiteSpace: "nowrap" }}>This group</span>
                  </div>
                  {rows.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <span className="flex items-center justify-center rounded-full mb-3" style={{ width: "52px", height: "52px", background: `${palette.gold}14`, border: `1px solid ${palette.gold}33` }}><Users size={22} style={{ color: palette.gold }} /></span>
                      <p style={{ color: palette.text, fontSize: "14px", fontWeight: 700 }}>No members yet</p>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-end justify-center gap-2 mb-7" style={{ minHeight: isDesktop ? "190px" : "160px" }}>
                        {podium.map((row) => {
                          const rank = rows.indexOf(row) + 1;
                          const isMe = row.member.username === communityUsername;
                          const h = isDesktop ? (rank === 1 ? 106 : rank === 2 ? 82 : 68) : (rank === 1 ? 84 : rank === 2 ? 64 : 54);
                          const colW = isDesktop ? 88 : 74;
                          return (
                            <button key={row.member.username} type="button" onClick={() => openCommunityMemberProfile(row.member.username)} className={`flex flex-col items-center ${TAP}`} style={{ width: `${colW}px`, alignSelf: "flex-end", minWidth: 0 }}>
                              <Avatar name={row.member.username} size={isDesktop ? (rank === 1 ? 58 : 48) : (rank === 1 ? 46 : 38)} src={avatarForAuthor(row.member.username)} ring />
                              <span className="truncate" style={{ width: "100%", marginTop: "6px", color: palette.text, fontSize: isDesktop ? "11.5px" : "10px", fontWeight: 700, textAlign: "center" }}><PlanName name={row.member.username} /></span>
                              <span style={{ color: rank === 1 ? palette.green : palette.textMuted, fontSize: isDesktop ? "12px" : "10.5px", fontWeight: 800, marginTop: "2px" }}>{metricText(row.stats)}</span>
                              <div style={{ width: `${colW - 4}px`, height: `${h}px`, marginTop: "6px", background: isMe ? `${palette.blue}12` : palette.surface, border: `1px solid ${rank === 1 ? palette.gold : isMe ? palette.blue : palette.border}`, borderBottom: "none", borderRadius: "10px 10px 0 0", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ color: rank === 1 ? palette.gold : palette.textMuted, fontFamily: mono, fontSize: isDesktop ? "16px" : "13px", fontWeight: 800 }}>{rank}</span></div>
                            </button>
                          );
                        })}
                      </div>
                      <div className="flex flex-col gap-1.5">
                        {rest.map((row, idx) => {
                          const rank = idx + 4;
                          const isMe = row.member.username === communityUsername;
                          return (
                            <button key={row.member.username} type="button" onClick={() => openCommunityMemberProfile(row.member.username)} className={`w-full flex items-center gap-2 rounded-xl px-2.5 py-2 text-left ${TAP}`} style={{ background: isMe ? `${palette.blue}10` : palette.surface, border: `1px solid ${isMe ? palette.blue + "66" : palette.border}` }}>
                              <span style={{ width: "18px", flexShrink: 0, textAlign: "center", color: palette.textFaint, fontFamily: mono, fontSize: "10.5px" }}>{rank}</span>
                              <Avatar name={row.member.username} size={isDesktop ? 30 : 26} src={avatarForAuthor(row.member.username)} />
                              <span className="flex-1 min-w-0 truncate" style={{ color: palette.text, fontSize: isDesktop ? "12.5px" : "11.5px", fontWeight: 700 }}><PlanName name={row.member.username} /></span>
                              {isMe && <span style={{ flexShrink: 0, color: palette.blue, background: `${palette.blue}18`, border: `1px solid ${palette.blue}44`, borderRadius: "999px", padding: "3px 6px", fontSize: "8.5px", fontFamily: mono, fontWeight: 700 }}>YOU</span>}
                              <span style={{ flexShrink: 0, color: palette.text, fontSize: isDesktop ? "12.5px" : "11.5px", fontWeight: 800 }}>{metricText(row.stats)}</span>
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                  <p className="text-xs text-center mt-4" style={{ color: palette.textFaint }}>Leaderboard uses public member stats when available. Private stats stay hidden.</p>
                </div>
              );
            })()}
          </>

        ) : (
          <>


        {/* Messages */}
        <div className="relative flex-1 min-h-0 flex flex-col" style={{ background: palette.bg }}>
          <style>{`.msg-scroll{scrollbar-width:thin;scrollbar-color:${palette.textFaint}66 transparent}.msg-scroll::-webkit-scrollbar{width:8px}.msg-scroll::-webkit-scrollbar-thumb{background:${palette.textFaint}55;border-radius:8px}.msg-scroll::-webkit-scrollbar-button{display:none}@keyframes typingDot{0%,60%,100%{opacity:.35;transform:none}30%{opacity:1;transform:translateY(-3px)}}@keyframes msgIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}@keyframes sk{0%,100%{opacity:.5}50%{opacity:1}}.msg-in{animation:msgIn .18s ease-out both}.msg-sk{animation:sk 1.3s ease-in-out infinite}@media (prefers-reduced-motion:reduce){.msg-in,.msg-sk{animation:none}}`}</style>
          <div
            className="flex-1 msg-scroll"
            style={{ overflowY: "auto", minHeight: 0, overscrollBehavior: "contain", padding: isDesktop ? "14px 20px 10px" : "10px 10px 8px" }}
            onScroll={(e) => { const el = e.currentTarget; const far = el.scrollHeight - el.scrollTop - el.clientHeight > 260; if (far !== showJump) setShowJump(far); }}
            onClick={() => { if (activeMsgId) setActiveMsgId(null); }}
          >
            {!groupMessagesLoaded ? (
              <div className="flex flex-col gap-2.5" aria-label="Loading messages">
                {[62, 44, 70, 38, 56].map((w, i) => (
                  <div key={i} className="msg-sk" style={{ alignSelf: i % 2 ? "flex-end" : "flex-start", width: `${w}%`, height: "40px", borderRadius: "18px", background: palette.surface, border: `1px solid ${palette.border}`, animationDelay: `${i * 0.12}s` }} />
                ))}
              </div>
            ) : chatMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-8">
                <span className="flex items-center justify-center rounded-full mb-3" style={{ width: "60px", height: "60px", background: `${palette.gold}14`, border: `1px solid ${palette.gold}33` }}>
                  <MessageCircle size={26} style={{ color: palette.gold }} />
                </span>
                <p style={{ color: palette.text, fontSize: "15px", fontWeight: 700, marginBottom: "4px" }}>No messages yet</p>
                <p className="text-xs" style={{ color: palette.textFaint, maxWidth: "240px", lineHeight: 1.5 }}>Say hello to get the conversation going.</p>
              </div>
            ) : (
              <div className="flex flex-col">
                {chatMessages.map((m, i) => {
                  const isMe = m.author === communityUsername;
                  const prev = chatMessages[i - 1];
                  const next = chatMessages[i + 1];
                  const sameDay = (a, b) => new Date(a.ts).toDateString() === new Date(b.ts).toDateString();
                  const newDay = !prev || !sameDay(prev, m);
                  const joinsPrev = !!prev && !newDay && prev.author === m.author && m.ts - prev.ts < 3 * 60 * 1000;
                  const joinsNext = !!next && sameDay(next, m) && next.author === m.author && next.ts - m.ts < 3 * 60 * 1000;
                  const selected = activeMsgId === m.id;
                  const canDelete = isMe || isGroupOwner;
                  const entry = groupMembersList.find((x) => x.username === m.author);
                  const badge = entry?.isOwner ? "Owner" : entry?.isAdmin ? "Admin" : null;
                  const R = 18, r = 5;
                  const radius = isMe ? `${R}px ${joinsPrev ? r : R}px ${joinsNext ? r : R}px ${R}px` : `${joinsPrev ? r : R}px ${R}px ${R}px ${joinsNext ? r : R}px`;
                  const bubbleColor = isMe ? palette.gold : palette.surface;
                  const textColor = isMe ? palette.letterbox : palette.text;
                  const preview = m.type === "sticker" ? "Sticker" : (m.text || "").slice(0, 60);
                  const replyTo = () => {
                    setReplyingTo({ id: m.id, author: m.author, preview });
                    setActiveMsgId(null);
                    setTimeout(() => { if (composerRef.current) composerRef.current.focus(); }, 30);
                  };
                  const emojiOnly = m.type !== "sticker" && isEmojiOnly(m.text);
                  const overlap = m.type !== "sticker" && !emojiOnly;
                  const replyBlock = (() => {
                    if (!m.replyToAuthor) return null;
                    const rid = m.replyToId || m.replyTo;
                    const target = m.replyToAuthor === communityUsername ? (isMe ? "yourself" : "you") : m.replyToAuthor;
                    const who = isMe ? "You" : m.author;
                    return (
                      <div style={{ alignSelf: isMe ? "flex-end" : "flex-start", maxWidth: "100%", display: "flex", flexDirection: "column", alignItems: isMe ? "flex-end" : "flex-start", marginBottom: overlap ? "-13px" : "5px" }}>
                        <div className="flex items-center" style={{ gap: "5px", fontSize: "12px", color: palette.textFaint, margin: "0 4px 4px", fontWeight: 600 }}>
                          <CornerUpLeft size={12} />
                          <span className="truncate">{who} replied to {target}</span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); if (rid) jumpTo(rid); }}
                          className={TAP}
                          style={{
                            display: "block", maxWidth: "100%", textAlign: "left", cursor: rid ? "pointer" : "default",
                            padding: overlap ? "8px 13px 21px" : "8px 13px", borderRadius: "18px",
                            background: palette.field, border: `1px solid ${palette.border}`, color: palette.textMuted,
                            fontSize: "13.5px", lineHeight: 1.35, opacity: 0.95,
                          }}
                        >
                          <span style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", whiteSpace: "normal", overflowWrap: "anywhere" }}>{m.replyToText || "Message"}</span>
                        </button>
                      </div>
                    );
                  })();
                  const iconBtn = (label, onClick, children, color) => (
                    <button type="button" aria-label={label} title={label} onClick={(e) => { e.stopPropagation(); onClick(); }} className={`flex items-center justify-center rounded-full ${TAP}`} style={{ width: "34px", height: "34px", background: "none", border: "none", color: color || palette.textMuted }}>{children}</button>
                  );
                  return (
                    <div key={m.id}>
                      {newDay && (
                        <div className="flex justify-center" style={{ margin: i === 0 ? "2px 0 8px" : "14px 0 8px" }}>
                          <span style={{ fontSize: "11.5px", fontWeight: 600, color: palette.textMuted, background: palette.surface, border: `1px solid ${palette.border}`, borderRadius: "999px", padding: "3px 12px" }}>{dayLabel(m.ts)}</span>
                        </div>
                      )}
                      <div style={{ position: "relative" }}>
                      <span className="reply-hint" aria-hidden="true" style={{ position: "absolute", right: "6px", top: "50%", marginTop: "-15px", width: "30px", height: "30px", borderRadius: "999px", background: palette.surface, border: `1px solid ${palette.border}`, color: palette.gold, display: "grid", placeItems: "center", opacity: 0, pointerEvents: "none" }}><CornerUpLeft size={15} /></span>
                      <div
                        id={`msg-${m.id}`}
                        className="msg-in flex"
                        style={{ justifyContent: isMe ? "flex-end" : "flex-start", alignItems: "flex-end", gap: "6px", marginTop: newDay ? 0 : joinsPrev ? "2px" : "10px", borderRadius: "12px" }}
                        onTouchStart={(e) => { const t = e.touches[0]; swipe.current = { x: t.clientX, y: t.clientY, id: m.id }; }}
                        onTouchMove={(e) => {
                          const t = e.touches[0]; const sw = swipe.current;
                          if (sw.id !== m.id || Math.abs(t.clientY - sw.y) > 30) return;
                          const dx = Math.max(-72, Math.min(0, t.clientX - sw.x));
                          const row = e.currentTarget;
                          row.style.transition = "none"; row.style.transform = `translateX(${dx}px)`;
                          const hint = row.parentElement && row.parentElement.querySelector(".reply-hint");
                          if (hint) { hint.style.opacity = String(Math.min(1, -dx / 48)); hint.style.transform = `scale(${0.6 + Math.min(0.4, -dx / 120)})`; }
                        }}
                        onTouchEnd={(e) => {
                          const t = e.changedTouches[0]; const sw = swipe.current; const row = e.currentTarget;
                          const fire = sw.id === m.id && t.clientX - sw.x < -64 && Math.abs(t.clientY - sw.y) < 30;
                          row.style.transition = "transform .18s ease"; row.style.transform = "";
                          const hint = row.parentElement && row.parentElement.querySelector(".reply-hint");
                          if (hint) hint.style.opacity = "0";
                          if (fire) { if (navigator.vibrate) navigator.vibrate(8); replyTo(); }
                          swipe.current = { x: 0, y: 0, id: null };
                        }}
                      >
                        {!isMe && (
                          <span style={{ width: "30px", flexShrink: 0, lineHeight: 0 }}>
                            {!joinsNext && (
                              <button type="button" onClick={() => openCommunityMemberProfile(m.author)} className={TAP} style={{ background: "none", border: "none", padding: 0, lineHeight: 0 }} aria-label={`Open ${m.author}'s profile`}>
                                <Avatar name={m.author} size={30} src={avatarForAuthor(m.author)} online={isAuthorOnline(m.author)} />
                              </button>
                            )}
                          </span>
                        )}
                        <div className="flex flex-col" style={{ maxWidth: isDesktop ? "62%" : "80%", minWidth: 0, alignItems: isMe ? "flex-end" : "flex-start" }}>
                          {replyBlock}
                          {m.type === "sticker" ? (
                            <div onClick={(e) => { e.stopPropagation(); setActiveMsgId(selected ? null : m.id); }} style={{ cursor: "pointer" }}>
                              <img src={m.text} alt="Sticker" style={{ width: "128px", height: "128px", objectFit: "contain", display: "block" }} />
                            </div>
                          ) : emojiOnly ? (
                            <div onClick={(e) => { e.stopPropagation(); setActiveMsgId(selected ? null : m.id); }} onDoubleClick={(e) => { e.stopPropagation(); if (REACTION_EMOJIS[0]) toggleMessageReaction(m.id, REACTION_EMOJIS[0]); }} style={{ cursor: "pointer", textAlign: isMe ? "right" : "left" }}>
                              <div style={{ fontSize: "46px", lineHeight: 1.15 }}>{m.text}</div>
                              <div style={{ fontSize: "10.5px", color: palette.textFaint, marginTop: "1px" }}>{clockTime(m.ts)}</div>
                            </div>
                          ) : (
                            <div
                              onClick={(e) => { e.stopPropagation(); setActiveMsgId(selected ? null : m.id); }}
                              onDoubleClick={(e) => { e.stopPropagation(); if (REACTION_EMOJIS[0]) toggleMessageReaction(m.id, REACTION_EMOJIS[0]); }}
                              style={{
                                display: "flow-root", cursor: "pointer", background: bubbleColor, color: textColor, borderRadius: radius,
                                position: "relative", zIndex: 1,
                                padding: Object.keys(m.reactions || {}).length > 0 ? "7px 11px 13px" : "7px 11px 6px", fontSize: "15px", lineHeight: 1.4, whiteSpace: "pre-wrap", overflowWrap: "anywhere", wordBreak: "break-word",
                                boxShadow: `${m.replyToAuthor ? `0 0 0 3px ${palette.bg}, ` : ""}${selected ? `0 0 0 2px ${palette.gold}99` : "0 1px 2px rgba(0,0,0,0.10)"}`,
                                border: isMe ? "none" : `1px solid ${palette.border}`,
                              }}
                            >
                              {!isMe && !joinsPrev && (
                                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px" }}>
                                  <button type="button" onClick={(e) => { e.stopPropagation(); openCommunityMemberProfile(m.author); }} className={TAP} style={{ background: "none", border: "none", padding: 0, fontSize: "13px", fontWeight: 700, color: nameColor(m.author) }}>
                                    {m.author}
                                  </button>
                                  {badge && <span style={{ fontSize: "10px", fontWeight: 700, color: palette.gold, background: `${palette.gold}1a`, borderRadius: "999px", padding: "0 6px", lineHeight: "15px" }}>{badge}</span>}
                                </div>
                              )}
                              <span>{renderText(m.text)}</span>
                              <span style={{ float: "right", margin: "7px 0 -3px 12px", fontSize: "10.5px", fontFamily: sans, opacity: 0.65, lineHeight: 1 }}>{clockTime(m.ts)}</span>
                            </div>
                          )}
                          {Object.keys(m.reactions || {}).length > 0 && (
                            <div className="flex items-center flex-wrap" style={{ gap: "4px", marginTop: "-11px", padding: "0 8px", position: "relative", zIndex: 2, justifyContent: isMe ? "flex-end" : "flex-start" }}>
                              {Object.entries(m.reactions).map(([emoji, count]) => {
                                const mine = (m.myReactions || []).includes(emoji);
                                return (
                                  <button key={emoji} type="button" onClick={(e) => { e.stopPropagation(); toggleMessageReaction(m.id, emoji); }} className={TAP}
                                    style={{
                                      display: "inline-flex", alignItems: "center", gap: "4px", height: "26px", padding: "0 9px", borderRadius: "999px",
                                      fontSize: "13px", fontFamily: sans, fontWeight: 700, lineHeight: 1,
                                      color: mine ? palette.letterbox : palette.text,
                                      background: mine ? palette.gold : palette.surface,
                                      border: `1px solid ${mine ? palette.gold : palette.textFaint}`,
                                      boxShadow: `0 0 0 2px ${palette.bg}, 0 3px 8px rgba(0,0,0,0.16)`,
                                    }}
                                    aria-label={`${emoji} reaction, ${count}`}>
                                    <span style={{ fontSize: "14px" }}>{emoji}</span>{count > 1 && <span>{count}</span>}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                          {selected && (
                            <div className="msg-in flex items-center" style={{ marginTop: "6px", padding: "3px 6px", gap: "1px", borderRadius: "999px", background: palette.surface, border: `1px solid ${palette.textFaint}`, boxShadow: `0 0 0 2px ${palette.bg}, 0 8px 24px rgba(0,0,0,0.20)`, maxWidth: "100%", overflowX: "auto", position: "relative", zIndex: 3 }}>
                              {REACTION_EMOJIS.slice(0, 6).map((emoji) => (
                                <button key={emoji} type="button" onClick={(e) => { e.stopPropagation(); toggleMessageReaction(m.id, emoji); setActiveMsgId(null); }} className={TAP} style={{ width: "34px", height: "34px", fontSize: "19px", background: "none", border: "none", padding: 0 }}>{emoji}</button>
                              ))}
                              <span aria-hidden="true" style={{ width: "1px", height: "20px", background: palette.border, margin: "0 3px", flexShrink: 0 }} />
                              {iconBtn("Reply", replyTo, <CornerUpLeft size={17} />)}
                              {m.type !== "sticker" && iconBtn("Copy text", () => { try { navigator.clipboard.writeText(m.text || ""); } catch (e) { /* clipboard unavailable */ } setActiveMsgId(null); }, <Copy size={16} />)}
                              {isGroupOwner && iconBtn(pinnedMessageId === m.id ? "Unpin" : "Pin", () => { pinCommunityMessage(pinnedMessageId === m.id ? null : m.id); setActiveMsgId(null); }, <Pin size={16} />, pinnedMessageId === m.id ? palette.gold : undefined)}
                              {canDelete && iconBtn("Delete message", () => { setPendingDeleteMsg(m.id); setActiveMsgId(null); }, <Trash2 size={16} />, palette.red)}
                            </div>
                          )}
                        </div>
                      </div>
                      </div>
                    </div>
                  );
                })}
                {typingUsers.length > 0 && (
                  <div className="msg-in flex items-end" style={{ marginTop: "8px", gap: "6px" }} aria-label="Someone is typing">
                    <span style={{ width: "30px", flexShrink: 0 }} />
                    <div className="flex items-center" style={{ gap: "4px", padding: "13px 14px", borderRadius: "18px 18px 18px 5px", background: palette.surface, border: `1px solid ${palette.border}` }}>
                      {[0, 1, 2].map((i) => <span key={i} style={{ width: "7px", height: "7px", borderRadius: "999px", background: palette.textFaint, display: "inline-block", animation: `typingDot 1.1s ${i * 0.15}s infinite` }} />)}
                    </div>
                  </div>
                )}
                <div ref={communityMessagesEndRef} />
              </div>
            )}
          </div>
          {showJump && (
            <button type="button" onClick={() => { if (communityMessagesEndRef.current) communityMessagesEndRef.current.scrollIntoView({ behavior: "smooth" }); }} className={`flex items-center justify-center rounded-full ${TAP}`}
              style={{ position: "absolute", right: "14px", bottom: "12px", width: "40px", height: "40px", background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow, color: palette.text }} aria-label="Jump to latest message">
              <ArrowDown size={18} />
            </button>
          )}
        </div>

        {/* Composer */}
        <div
          className="flex-shrink-0 relative"
          style={{
            borderTop: `1px solid ${palette.border}`,
            background: palette.surface,
            padding: isDesktop ? "12px 16px" : "8px 10px",
            paddingBottom: isDesktop ? undefined : "calc(8px + env(safe-area-inset-bottom, 0px))",
          }}
        >
          {replyingTo && (
            <div className="msg-in flex items-stretch" style={{ marginBottom: "8px", borderRadius: "12px", overflow: "hidden", background: palette.field, border: `1px solid ${palette.border}` }}>
              <span aria-hidden="true" style={{ width: "4px", flexShrink: 0, background: nameColor(replyingTo.author) }} />
              <CornerUpLeft size={17} style={{ color: nameColor(replyingTo.author), flexShrink: 0, alignSelf: "center", margin: "0 4px 0 10px" }} />
              <div className="min-w-0 flex-1" style={{ padding: "7px 6px 7px 8px" }}>
                <div className="truncate" style={{ color: nameColor(replyingTo.author), fontSize: "13px", fontWeight: 700 }}>Replying to {replyingTo.author === communityUsername ? "yourself" : replyingTo.author}</div>
                <div className="truncate" style={{ color: palette.textMuted, fontSize: "13px", marginTop: "1px" }}>{replyingTo.preview}</div>
              </div>
              <button type="button" onClick={() => setReplyingTo(null)} className={`flex items-center justify-center flex-shrink-0 ${TAP}`} style={{ width: "40px", color: palette.textFaint }} aria-label="Cancel reply">
                <X size={17} />
              </button>
            </div>
          )}
          <input ref={stickerFileInputRef} type="file" accept="image/*" onChange={handleStickerFileChange} style={{ display: "none" }} />
          {stickerPickerOpen && (
            <div
              className="rounded-2xl mb-2"
              style={{
                background: palette.surface,
                border: `1px solid ${palette.border}`,
                boxShadow: palette.shadow,
                padding: "10px",
                maxHeight: "280px",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 overflow-x-auto" style={{ WebkitOverflowScrolling: "touch" }}>
                  {stickerPacks.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setStickerActivePackId(p.id)}
                      className={`flex-shrink-0 rounded-full px-2.5 py-1 ${TAP}`}
                      style={{
                        background: stickerActivePackId === p.id ? palette.gold : palette.field,
                        color: stickerActivePackId === p.id ? palette.letterbox : palette.textMuted,
                        fontSize: "11px",
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setStickerManageMode((v) => !v)}
                  className={TAP}
                  style={{ color: stickerManageMode ? palette.gold : palette.textFaint, fontSize: "11px", fontWeight: 700, flexShrink: 0, marginLeft: "8px" }}
                >
                  {stickerManageMode ? "Done" : "Manage"}
                </button>
              </div>

              {stickerManageMode && (
                <div className="flex items-center gap-1.5 mb-2">
                  <input
                    type="text"
                    value={stickerNewPackName}
                    onChange={(e) => setStickerNewPackName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") createStickerPack(); }}
                    placeholder="New pack name"
                    className="flex-1 bg-transparent outline-none rounded-lg px-2.5 py-1.5"
                    style={{ background: palette.field, border: `1px solid ${palette.border}`, color: palette.text, fontSize: "12px" }}
                  />
                  <button
                    type="button"
                    onClick={createStickerPack}
                    disabled={!stickerNewPackName.trim()}
                    className={TAP}
                    style={{ background: palette.gold, color: palette.letterbox, borderRadius: "8px", padding: "6px 10px", fontSize: "11px", fontWeight: 700, opacity: !stickerNewPackName.trim() ? 0.5 : 1 }}
                  >
                    Add
                  </button>
                </div>
              )}

              {stickerError && (
                <p className="text-xs mb-2" style={{ color: palette.red }}>{stickerError}</p>
              )}

              <div style={{ overflowY: "auto", flex: 1 }}>
                {!stickerActivePackId ? (
                  <p className="text-xs text-center py-6" style={{ color: palette.textFaint }}>
                    {stickerPacks.length === 0 ? "Tap Manage to create your first sticker pack." : "Pick a pack above."}
                  </p>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {(stickerPacks.find((p) => p.id === stickerActivePackId)?.stickers || []).map((s) => (
                      <div key={s.id} className="relative">
                        <button
                          type="button"
                          onClick={() => (stickerManageMode ? deleteSticker(s.id, stickerActivePackId) : sendSticker(s.image))}
                          className={TAP}
                          style={{ width: "100%", aspectRatio: "1 / 1", background: "transparent", border: "none", padding: "4px" }}
                        >
                          <img src={s.image} alt="Sticker" style={{ width: "100%", height: "100%", objectFit: "contain", opacity: stickerManageMode ? 0.5 : 1 }} />
                          {stickerManageMode && (
                            <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: palette.red }}>
                              <Trash2 size={16} />
                            </span>
                          )}
                        </button>
                      </div>
                    ))}
                    {stickerManageMode && (
                      <button
                        type="button"
                        onClick={() => stickerFileInputRef.current && stickerFileInputRef.current.click()}
                        disabled={stickerUploading}
                        className={`flex items-center justify-center rounded-lg ${TAP}`}
                        style={{ aspectRatio: "1 / 1", background: palette.field, border: `1px dashed ${palette.border}`, color: palette.textMuted }}
                      >
                        {stickerUploading ? <Sparkles size={16} /> : <Plus size={18} />}
                      </button>
                    )}
                  </div>
                )}
                {stickerActivePackId && stickerManageMode && (
                  <button
                    type="button"
                    onClick={() => deleteStickerPack(stickerActivePackId)}
                    className={TAP}
                    style={{ marginTop: "10px", color: palette.red, fontSize: "11px", fontWeight: 600, background: "none", border: "none", padding: 0 }}
                  >
                    Delete this pack
                  </button>
                )}
              </div>
            </div>
          )}
          <style>{`.cmp-pill{transition:border-color .15s,box-shadow .15s}.cmp-pill:focus-within{border-color:${palette.gold}99!important;box-shadow:0 0 0 3px ${palette.gold}22}.cmp-pill textarea::placeholder{color:${palette.textFaint};opacity:1}`}</style>
          <div className="flex items-end" style={{ gap: "8px" }}>
            <div className="cmp-pill flex items-end flex-1 min-w-0" style={{ background: palette.field, border: `1px solid ${palette.border}`, borderRadius: "26px", padding: "0 6px 0 4px", minHeight: "48px" }}>
              <button
                type="button"
                onClick={() => { if (!stickerPacksLoaded) fetchStickerPacks(); setStickerPickerOpen((v) => !v); }}
                className={`flex items-center justify-center rounded-full flex-shrink-0 ${TAP}`}
                style={{ width: "40px", height: "46px", color: stickerPickerOpen ? palette.gold : palette.textFaint }}
                aria-label="Stickers"
              >
                <Sticker size={22} />
              </button>
              <textarea
                ref={composerRef}
                rows={1}
                value={communityMsgText}
                onChange={(e) => { setCommunityMsgText(e.target.value); pingTyping(); }}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && isDesktop) { e.preventDefault(); sendCommunityMessage(); } }}
                placeholder="Message"
                enterKeyHint="send"
                className="flex-1 min-w-0 bg-transparent outline-none"
                style={{ resize: "none", display: "block", color: palette.text, fontSize: isDesktop ? "15px" : "16px", lineHeight: "22px", padding: "12px 6px", maxHeight: "124px", fontFamily: "inherit", border: "none" }}
              />
            </div>
            <button
              type="button"
              onClick={sendCommunityMessage}
              disabled={!communityMsgText.trim()}
              className={`flex items-center justify-center rounded-full flex-shrink-0 ${TAP}`}
              style={{
                width: "48px", height: "48px",
                background: communityMsgText.trim() ? palette.gold : palette.field,
                color: communityMsgText.trim() ? palette.letterbox : palette.textFaint,
                border: communityMsgText.trim() ? "none" : `1px solid ${palette.border}`,
                boxShadow: communityMsgText.trim() ? `0 4px 12px ${palette.gold}55` : "none",
                transform: communityMsgText.trim() ? "scale(1)" : "scale(0.94)",
                transition: "background .15s, transform .15s, color .15s, box-shadow .15s",
              }}
              aria-label="Send"
            >
              <Send size={20} />
            </button>
          </div>
          {communityApiError && (
            <p className="text-xs mt-2" style={{ color: palette.red }}>{communityApiError}</p>
          )}
        </div>
          </>
        )}

      </div>
    );
  };

  // ---------- Create / join group controls (shared by desktop sidebar + mobile lobby) ----------
  const renderGroupActions = () => {
    const fieldStyle = { background: palette.field, border: `1px solid ${palette.border}`, color: palette.text, fontSize: "12px" };
    return (
      <div className="mb-3">
        <button
          type="button"
          onClick={() => { setAddingGroup((v) => !v); setGroupCodeError(""); }}
          className={`w-full flex items-center justify-center gap-1.5 rounded-xl py-2.5 mb-2 ${TAP}`}
          style={{ background: addingGroup ? `${palette.gold}22` : palette.field, border: `1px solid ${addingGroup ? palette.gold : palette.border}`, color: addingGroup ? palette.gold : palette.textMuted, fontFamily: mono, fontSize: "11px", fontWeight: 700 }}
        >
          <Plus size={13} />{addingGroup ? "Cancel" : "Create a group"}
        </button>
        {addingGroup && (
          <div className="rounded-xl p-3 mb-2 space-y-2" style={{ background: palette.surface, border: `1px solid ${palette.border}` }}>
            <input value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} placeholder="Group name" maxLength={60} className="w-full rounded-lg px-3 py-2 outline-none" style={fieldStyle} />
            <input value={newGroupDesc} onChange={(e) => setNewGroupDesc(e.target.value)} placeholder="Description (optional)" maxLength={200} className="w-full rounded-lg px-3 py-2 outline-none" style={fieldStyle} />
            <input value={newGroupCode} onChange={(e) => setNewGroupCode(e.target.value)} placeholder="Invite code (4+ characters)" className="w-full rounded-lg px-3 py-2 outline-none" style={{ ...fieldStyle, fontFamily: mono }} />
            <input value={newGroupTags} onChange={(e) => setNewGroupTags(e.target.value)} placeholder="Tags, comma separated (optional)" className="w-full rounded-lg px-3 py-2 outline-none" style={fieldStyle} />
            <label className="flex items-center gap-2" style={{ color: palette.textMuted, fontSize: "11.5px" }}>
              <input type="checkbox" checked={newGroupPublic} onChange={(e) => setNewGroupPublic(e.target.checked)} />
              Make this group public
            </label>
            {groupCodeError && <div style={{ color: palette.red, fontSize: "11px" }}>{groupCodeError}</div>}
            <button
              type="button"
              disabled={creatingGroup}
              onClick={createCommunityGroup}
              className={`w-full rounded-lg py-2 ${TAP}`}
              style={{ background: palette.gold, color: palette.letterbox, fontFamily: mono, fontSize: "11.5px", fontWeight: 800, opacity: creatingGroup ? 0.6 : 1 }}
            >
              {creatingGroup ? "Creating…" : "Create group"}
            </button>
          </div>
        )}
        <div className="flex gap-2">
          <input
            value={joinCodeInput}
            onChange={(e) => { setJoinCodeInput(e.target.value); setJoinCodeError(""); }}
            onKeyDown={(e) => { if (e.key === "Enter" && joinCodeInput.trim() && !joiningGroup) joinGroupByCode(); }}
            placeholder="Have an invite code?"
            className="flex-1 min-w-0 rounded-lg px-3 py-2 outline-none"
            style={{ ...fieldStyle, fontFamily: mono }}
          />
          <button
            type="button"
            disabled={joiningGroup || !joinCodeInput.trim()}
            onClick={joinGroupByCode}
            className={`rounded-lg px-3 ${TAP}`}
            style={{ background: palette.field, border: `1px solid ${palette.border}`, color: palette.gold, fontFamily: mono, fontSize: "11px", fontWeight: 800, opacity: joiningGroup || !joinCodeInput.trim() ? 0.5 : 1 }}
          >
            {joiningGroup ? "…" : "Join"}
          </button>
        </div>
        {joinCodeError && <div className="mt-1.5" style={{ color: palette.red, fontSize: "11px" }}>{joinCodeError}</div>}
      </div>
    );
  };

  // ---------- Community sidebar ----------
  const renderSidebar = () => (
    <div className="flex flex-col flex-shrink-0 rounded-2xl overflow-y-auto" style={{ width: "312px", minHeight: 0, border: `1px solid ${palette.border}`, boxShadow: palette.shadow, background: palette.surface }}>
      <div className="p-3.5">
        <form onSubmit={(e) => { e.preventDefault(); searchCommunity(communitySearch); }}>
          <div className="flex items-center gap-2 rounded-xl px-3" style={{ height: "40px", background: palette.field, border: `1px solid ${palette.border}` }}>
            <Search size={15} style={{ color: palette.textFaint }} />
            <input
              value={communitySearch}
              onChange={(e) => setCommunitySearch(e.target.value)}
              placeholder="Search"
              className="flex-1 min-w-0 bg-transparent outline-none"
              style={{ color: palette.text, fontSize: "12px" }}
            />
          </div>
        </form>
      </div>
      <div className="px-3.5 pb-3">
        <button
          type="button"
          onClick={() => { setActiveGroupId(null); setCommunityLobbyTab("global"); if (!globalFeedLoaded) loadGlobalFeed(); }}
          className={`w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 mb-3 ${TAP}`}
          style={{ background: communityLobbyTab === "global" && !activeGroupId ? `${palette.gold}18` : "transparent", border: `1px solid ${communityLobbyTab === "global" && !activeGroupId ? `${palette.gold}55` : palette.border}`, color: palette.text }}
        >
          <Newspaper size={15} style={{ color: palette.gold }} />
          <span style={{ fontSize: "12.5px", fontWeight: 800 }}>Global Feed</span>
        </button>
        <div className="px-1 mb-2" style={{ color: palette.textFaint, fontSize: "9.5px", fontFamily: mono, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em" }}>My Groups</div>
        {renderGroupActions()}
        {myGroups.length === 0 ? (
          <div className="rounded-xl p-4 text-center" style={{ background: palette.field, border: `1px solid ${palette.border}` }}>
            <Users size={18} style={{ color: palette.gold, margin: "0 auto 6px" }} />
            <div style={{ color: palette.text, fontSize: "12px", fontWeight: 700 }}>No groups yet</div>
            <div style={{ color: palette.textFaint, fontSize: "10.5px", marginTop: "3px" }}>Create a group or join one with an invite code.</div>
          </div>
        ) : (
          <div className="space-y-1">
            {myGroups.map((g) => {
              const active = activeGroupId === g.id;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => { setCommunityLobbyTab("mine"); setActiveGroupId(g.id); }}
                  className={`w-full flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-left ${TAP}`}
                  style={{ background: active ? `${palette.gold}18` : "transparent", border: `1px solid ${active ? `${palette.gold}55` : "transparent"}` }}
                >
                  <Avatar name={g.name} size={38} src={g.avatar} />
                  <div className="flex-1 min-w-0">
                    <div className="truncate" style={{ color: palette.text, fontSize: "13.5px", fontWeight: 700 }}>{g.name}</div>
                    <div style={{ color: palette.textFaint, fontSize: "11px", marginTop: "1px" }}>{g.role === "owner" ? "Owner" : "Member"}</div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
      <div className="px-3.5 pb-3">
        <div className="px-1 mb-2" style={{ color: palette.textFaint, fontSize: "9.5px", fontFamily: mono, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em" }}>Explore</div>
        <div className="space-y-1">
          {[["XAUUSD", "XAUUSD"], ["Gold", "Gold"], ["OrderFlow", "OrderFlow"], ["VolumeProfile", "VolumeProfile"], ["Trade Ideas", "trade ideas"], ["Charts", "charts"], ["Education", "education"], ["Journal", "journal"]].map(([label, q]) => (
            <button key={label} type="button" onClick={() => searchCommunity(q)} className={`w-full text-left rounded-xl px-3 py-2.5 ${TAP}`} style={{ background: "transparent", color: palette.textMuted, fontSize: "11.5px" }}>{label}</button>
          ))}
        </div>
      </div>
    </div>
  );


  if (!communityUsername) {
    // ---------- ONBOARDING (unchanged) ----------
    body = (
      <>
        <div
          className="rounded-3xl p-6 mb-5 text-center relative overflow-hidden"
          style={{
            background: palette.surface,
            border: `1px solid ${palette.gold}44`,
            boxShadow: palette.shadow,
          }}
        >
          <div className="flex justify-center mb-3">
            <Avatar name={communityUsernameDraft || "Trader"} size={64} ring />
          </div>
          <div style={{ fontFamily: display, fontSize: "19px", fontWeight: 800, color: palette.text }}>
            Join the Trader Community
          </div>
          <p className="text-xs mt-1.5" style={{ color: palette.textMuted, maxWidth: "300px", margin: "6px auto 0" }}>
            Private groups, live chat, and shared trades — pick a username to get started.
          </p>
        </div>

        <span className="block mb-1.5 uppercase" style={{ color: palette.textMuted, letterSpacing: "0.08em", fontSize: "11px" }}>
          Your Username
        </span>
        <input
          type="text"
          value={communityUsernameDraft}
          onChange={(e) => { setCommunityUsernameDraft(e.target.value); setCommunityUsernameError(""); }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && communityUsernameDraft.trim() && !communityUsernameBusy) {
              claimCommunityUsername(communityUsernameDraft.trim());
            }
          }}
          placeholder="e.g. FX_Rafi"
          maxLength={24}
          className="w-full rounded-2xl px-4 py-3.5 mb-1.5 bg-transparent outline-none"
          style={{ background: palette.field, border: `1px solid ${communityUsernameError ? palette.red : palette.border}`, color: palette.text, fontFamily: mono, fontSize: "15px" }}
        />
        {communityUsernameError ? (
          <p className="text-xs mb-3" style={{ color: palette.red }}>{communityUsernameError}</p>
        ) : (
          <p className="text-xs mb-3" style={{ color: palette.textFaint }}>
            3–24 characters: letters, numbers, and underscores. It's yours alone — nobody else can take it.
          </p>
        )}
        <button
          type="button"
          disabled={communityUsernameBusy || !communityUsernameDraft.trim()}
          onClick={() => communityUsernameDraft.trim() && claimCommunityUsername(communityUsernameDraft.trim())}
          className={`w-full rounded-2xl py-3.5 ${TAP}`}
          style={{
            background: palette.gold,
            color: palette.letterbox,
            fontFamily: mono, fontSize: "14px", fontWeight: 700,
            boxShadow: `0 6px 18px ${palette.gold}44`,
            opacity: communityUsernameBusy || !communityUsernameDraft.trim() ? 0.6 : 1,
          }}
        >
          {communityUsernameBusy ? "Checking…" : "Continue"}
        </button>
        <p className="text-xs mt-3 text-center" style={{ color: palette.textFaint }}>
          Your name, groups, and messages here are visible to everyone using this app.
        </p>
      </>
    );
} else if (LEDGER_COMMUNITY) {
    // ---------- LEDGER COMMUNITY (Feed / Rooms / Ranks / Mentor) ----------
    const mine = getCommunityMemberStats({ username: communityUsername });
    body = (
      <div className="flex flex-col flex-1 min-h-0" style={{ height: "100%" }}>
        <LedgerCommunity
          isDesktop={isDesktop}
          communityAvatar={communityAvatar}
          openMember={openCommunityMemberProfile}
          openMyProfile={() => openCommunityMemberProfile(communityUsername)}
          myDiscipline={mine?.disciplineScore}
          sessionToken={session?.token}
          username={communityUsername}
          trades={trades}
        />
      </div>
    );
  } else if (isDesktop) {
    // ---------- DESKTOP COMMUNITY ----------
    body = (
      <div className="flex gap-4 flex-1" style={{ minHeight: 0, height: "100%" }}>
        {renderSidebar()}
        <div className="relative flex-1 min-w-0 rounded-2xl overflow-hidden" style={{ border: `1px solid ${palette.border}`, boxShadow: palette.shadow }}>
          {communityLobbyTab === "search" ? renderCommunitySearch() : activeGroupId ? renderChatPanel({ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, height: "auto", background: palette.bg }) : communityLobbyTab === "global" ? renderGlobalFeedWide() : (
            <div className="flex flex-col items-center justify-center h-full text-center px-8" style={{ background: palette.bg }}>
              <span className="flex items-center justify-center rounded-full mb-4" style={{ width: "64px", height: "64px", background: `${palette.gold}14`, border: `1px solid ${palette.gold}33` }}><Users size={28} style={{ color: palette.gold }} /></span>
              <div style={{ fontFamily: display, fontSize: "17px", fontWeight: 700, color: palette.text, marginBottom: "6px" }}>Pick a group to start</div>
              <p className="text-xs" style={{ color: palette.textFaint, maxWidth: "280px" }}>Select a group on the left to open its chat and tools, or switch back to Global Feed.</p>
            </div>
          )}
        </div>
      </div>
    );
  } else if (communityLobbyTab === "search") {
    // ---------- MOBILE COMMUNITY SEARCH ----------
    body = <div className="flex flex-col flex-1 min-h-0 rounded-2xl overflow-hidden" style={{ border: `1px solid ${palette.border}`, boxShadow: palette.shadow }}><button type="button" onClick={() => { setCommunityLobbyTab("mine"); }} className={`flex items-center gap-1.5 px-3 py-2.5 ${TAP}`} style={{ background: palette.surface, borderBottom: `1px solid ${palette.border}`, color: palette.textMuted, fontFamily: mono, fontSize: "11px", fontWeight: 700 }}><ChevronLeft size={14} />Groups</button><div className="flex-1 min-h-0">{renderCommunitySearch()}</div></div>;
  } else if (communityMobileFeedOpen && !activeGroupId) {
    // ---------- MOBILE GLOBAL FEED ----------
    body = <div className="flex flex-col flex-1 min-h-0 rounded-2xl overflow-hidden" style={{ border: `1px solid ${palette.border}`, boxShadow: palette.shadow }}>{renderGlobalFeedWide()}</div>;
  } else if (!activeGroupId) {
    // ---------- MOBILE GROUP LOBBY ----------
    const joined = myGroups;
    body = (
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex-1 overflow-y-auto">
          <form className="mb-3" onSubmit={(e) => { e.preventDefault(); searchCommunity(communitySearch); }}>
            <div className="flex items-center gap-2.5 rounded-full px-4" style={{ height: "44px", background: palette.field, border: `1px solid ${palette.border}` }}>
              <Search size={17} style={{ color: palette.textFaint }} />
              <input value={communitySearch} onChange={(e) => setCommunitySearch(e.target.value)} placeholder="Search people & posts" className="flex-1 min-w-0 bg-transparent outline-none" style={{ color: palette.text, fontSize: "15px" }} />
            </div>
          </form>
          <button type="button" onClick={() => { setCommunityLobbyTab("global"); setCommunityMobileFeedOpen(true); if (!globalFeedLoaded) loadGlobalFeed(); }} className={`w-full flex items-center gap-3.5 px-1 py-3 text-left ${TAP}`} style={{ background: "transparent", border: "none", borderBottom: `1px solid ${palette.border}`, color: palette.text }}>
            <span className="flex items-center justify-center rounded-full flex-shrink-0" style={{ width: "54px", height: "54px", background: palette.gold, color: palette.letterbox }}><Newspaper size={23} /></span>
            <div className="flex-1 min-w-0"><div style={{ fontSize: "15.5px", fontWeight: 700 }}>Global feed</div><div className="truncate" style={{ color: palette.textFaint, fontSize: "13.5px", marginTop: "3px" }}>Posts from everyone on Tredzi</div></div>
            <ChevronRight size={17} style={{ color: palette.textFaint, flexShrink: 0 }} />
          </button>
          <div className="flex items-center justify-between" style={{ margin: "16px 2px 4px" }}><span style={{ color: palette.text, fontSize: "14px", fontWeight: 800 }}>Groups{joined.length ? ` · ${joined.length}` : ""}</span></div>
          {renderGroupActions()}
          {joined.length === 0 ? (
            <div className="rounded-2xl p-5 text-center" style={{ background: palette.surface, border: `1px solid ${palette.border}` }}><Users size={22} style={{ color: palette.gold, margin: "0 auto 8px" }} /><div style={{ color: palette.text, fontSize: "13px", fontWeight: 700 }}>No groups yet</div><div style={{ color: palette.textFaint, fontSize: "11px", marginTop: "4px" }}>Create a group or join one with an invite code.</div></div>
          ) : joined.map((g) => (
            <button key={g.id} type="button" onClick={() => { setCommunityLobbyTab("mine"); setCommunityMobileFeedOpen(false); setActiveGroupId(g.id); }} className={`w-full flex items-center gap-3.5 px-1 py-3 text-left ${TAP}`} style={{ background: "transparent", border: "none", borderBottom: `1px solid ${palette.border}` }}>
              <Avatar name={g.name} size={54} src={g.avatar} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate" style={{ color: palette.text, fontSize: "15.5px", fontWeight: 700 }}>{g.name}</span>
                  {g.lastMessageAt ? <span style={{ flexShrink: 0, fontSize: "12px", color: Number(g.unread) > 0 ? palette.gold : palette.textFaint, fontWeight: Number(g.unread) > 0 ? 700 : 500 }}>{listTime(g.lastMessageAt)}</span> : null}
                </div>
                <div className="flex items-center justify-between gap-2" style={{ marginTop: "3px" }}>
                  <span className="truncate" style={{ color: Number(g.unread) > 0 ? palette.text : palette.textFaint, fontSize: "13.5px" }}>
                    {g.lastMessage ? `${g.lastMessageAuthor ? `${g.lastMessageAuthor}: ` : ""}${g.lastMessage}` : (g.description || (g.role === "owner" ? "You own this group" : "Tap to open the chat"))}
                  </span>
                  {Number(g.unread) > 0 && <span style={{ flexShrink: 0, minWidth: "21px", height: "21px", padding: "0 6px", borderRadius: "999px", background: palette.gold, color: palette.letterbox, fontSize: "11.5px", fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{Number(g.unread) > 99 ? "99+" : Number(g.unread)}</span>}
                </div>
              </div>

            </button>
          ))}
        </div>
      </div>
    );
  } else {
    // ---------- MOBILE GROUP ----------
    // Full screen on top of the app chrome (same layer as the profile screens), so the bottom navigation bar is out of the way while chatting.
    body = (
      <div className="fixed inset-0 flex flex-col" style={{ zIndex: 108, background: palette.bg }}>
        {renderChatPanel({ height: "100%" })}
      </div>
    );
  }
  body = (
    <>
      {body}
        {profileOpen && (() => {
          const viewingName = profileView || communityUsername;
          const isMe = !profileView || profileView === communityUsername;
          const pBase = profileData && String(profileData.username).toLowerCase() === String(viewingName || "").toLowerCase() ? profileData : null;
          // My own role / style / markets come from the Edit profile sheet
          const p = pBase && isMe ? { ...pBase, role: (profileExtras && profileExtras.role) || pBase.role, style: profileExtras && profileExtras.style && profileExtras.style.length ? profileExtras.style : pBase.style, markets: profileExtras && profileExtras.markets && profileExtras.markets.length ? profileExtras.markets : pBase.markets } : pBase;
          // ---- Profile UI copied from the Ledger reference (tredzi2.html): one column, 44px buttons,
          // segmented Overview / Stats / Posts tabs, label + row lists, card posts. Same on phone and PC.
          const colW = isDesktop ? "1280px" : "100%";
          const ibStyle = { width: "44px", height: "44px", borderRadius: "12px", background: `${palette.gold}16`, border: `1px solid ${palette.gold}55`, color: palette.gold };
          const lb = (left, right) => (
            <div className="flex items-center justify-between" style={{ fontFamily: sans, fontSize: "12px", fontWeight: 500, color: palette.textMuted, margin: "22px 0 8px" }}>
              <span>{left}</span>{right != null && <span>{right}</span>}
            </div>
          );
          const rowItem = (label, value, color) => (
            <div key={label} className="flex items-center justify-between gap-3" style={{ padding: "12px 0", minHeight: "44px", borderBottom: `1px solid ${palette.border}`, fontFamily: sans, fontSize: "14px" }}>
              <span style={{ color: palette.textMuted }}>{label}</span>
              <b style={{ color: color || palette.text, fontWeight: 600 }}>{value}</b>
            </div>
          );
          const btn = (primary, busy) => ({
            height: "44px", borderRadius: "12px", fontFamily: sans, fontSize: "14px", fontWeight: 600, flex: 1, whiteSpace: "nowrap",
            background: primary ? palette.gold : `${palette.gold}16`,
            border: primary ? "1px solid transparent" : `1px solid ${palette.gold}55`,
            color: primary ? palette.letterbox : palette.gold,
            opacity: busy ? 0.6 : 1,
          });
          const pill = (primary, busy) => ({
            height: "34px", padding: "0 18px", borderRadius: "10px", whiteSpace: "nowrap",
            fontSize: "13px", fontWeight: 600, fontFamily: sans,
            background: primary ? palette.gold : `${palette.gold}16`,
            border: `1px solid ${primary ? "transparent" : `${palette.gold}55`}`,
            color: primary ? palette.letterbox : palette.gold,
            opacity: busy ? 0.6 : 1,
          });
          const tag = (text) => (
            <span style={{ fontFamily: sans, fontSize: "11px", fontWeight: 500, padding: "2px 8px", borderRadius: "6px", border: `1px solid ${palette.border}`, color: palette.textMuted }}>{text}</span>
          );
          const shell = (children, aside) => (
            <div className="fixed inset-0 flex flex-col" style={{ background: palette.bg, zIndex: 108 }}>
              <div
                className="flex items-center gap-3 flex-shrink-0"
                style={{ padding: isDesktop ? "0 32px" : "12px 16px", height: isDesktop ? "68px" : undefined, paddingTop: isDesktop ? undefined : "max(12px, env(safe-area-inset-top))", background: palette.surface, borderBottom: `1px solid ${palette.border}` }}
              >
                <button type="button" onClick={closeProfileBack} className={`flex items-center justify-center gap-1.5 flex-shrink-0 ${TAP}`} style={isDesktop ? { ...ibStyle, width: "auto", height: "40px", padding: "0 16px 0 10px", fontFamily: sans, fontSize: "13.5px", fontWeight: 600 } : ibStyle} aria-label="Back">
                  <ChevronLeft size={isDesktop ? 18 : 22} strokeWidth={2.2} />{isDesktop && "Back"}
                </button>
                <h1 className="truncate flex-1 min-w-0" style={{ margin: 0, fontFamily: sans, fontSize: isDesktop ? "18px" : "22px", fontWeight: 600, letterSpacing: "-0.01em", lineHeight: 1.2, color: palette.text }}>
                  {isDesktop && <span style={{ color: palette.textMuted, fontWeight: 500 }}>Profile / </span>}{p ? p.username : (viewingName || "Profile")}
                </h1>
              </div>
              <div className="flex-1" style={{ overflowY: "auto", minHeight: 0 }}>
                {isDesktop && aside ? (
                  <div className="mx-auto w-full" style={{ maxWidth: colW, padding: "28px 32px 56px", display: "grid", gridTemplateColumns: "minmax(330px, 370px) minmax(0, 1fr)", gap: "28px", alignItems: "start" }}>
                    <aside style={{ position: "sticky", top: "24px", maxHeight: "calc(100vh - 124px)", overflowY: "auto", background: palette.surface, border: `1px solid ${palette.border}`, borderRadius: "18px", padding: "26px 24px 22px", boxShadow: palette.shadow }}>{aside}</aside>
                    <main style={{ minWidth: 0 }}>{children}</main>
                  </div>
                ) : (
                  <div className="mx-auto w-full" style={{ maxWidth: colW, padding: isDesktop ? "28px 32px 56px" : "16px 16px max(40px, env(safe-area-inset-bottom))" }}>
                    {children}
                  </div>
                )}
              </div>
            </div>
          );
          if (!p) {
            return shell(
              <p style={{ fontFamily: sans, fontSize: "14px", color: profileError ? palette.red : palette.textMuted, padding: "24px 0" }}>
                {profileError || (profileLoading ? "Loading profile…" : "Couldn't load this profile.")}
              </p>
            );
          }
          const stats = getCommunityMemberStats(p);
          const joinedText = p.joinedAt ? new Date(p.joinedAt).toLocaleDateString([], { month: "short", year: "numeric" }) : null;
          const mutuals = p.mutuals || [];
          const avatarSrc = isMe ? (communityAvatar || p.avatar || undefined) : (p.avatar || avatarForAuthor(p.username));
          const curve = stats.equityCurve || [];
          const cMin = Math.min(0, ...(curve.length ? curve : [0]));
          const cMax = Math.max(0, ...(curve.length ? curve : [0]));
          const cRange = cMax - cMin || 1;
          const cy = (v) => Math.round(100 - ((v - cMin) / cRange) * 88);
          const cx = (i) => Math.round((i / Math.max(1, curve.length - 1)) * 330);
          const curveLine = curve.length > 1 ? curve.map((v, i) => `${cx(i)},${cy(v)}`).join(" ") : "";
          const fmtPct = (v) => (v == null || !Number.isFinite(v) ? "—" : `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(1)}%`);
          const pnlColor = stats.pnlPct != null && stats.pnlPct < 0 ? palette.red : palette.green;
          const sections = [["overview", "Overview"], ["stats", "Stats"], ["posts", "Posts"], ["badges", "Badges"]];
          const tab = ["overview", "stats", "posts", "badges"].includes(profileSubTab) ? profileSubTab : "overview";

          const verifiedBadge = (
            <span className="inline-flex items-center justify-center flex-shrink-0" role="img" aria-label="Verified P&L" style={{ width: "18px", height: "18px", borderRadius: "50%", background: palette.green, color: "#fff" }}>
              <Check size={11} strokeWidth={3} />
            </span>
          );

          const tabsBar = (
            <div className="flex" role="tablist" aria-label="Profile sections" style={{ margin: isDesktop ? "22px 0 20px" : "16px 0 4px", padding: "3px", background: palette.surface, border: `1px solid ${palette.border}`, borderRadius: "12px", maxWidth: isDesktop ? "560px" : undefined }}>
              {sections.map(([id, label]) => {
                const on = tab === id;
                return (
                  <button key={id} type="button" role="tab" aria-selected={on} onClick={() => setProfileSubTab(id)} className={TAP} style={{ flex: 1, height: "40px", borderRadius: "9px", fontFamily: sans, fontSize: "14px", fontWeight: on ? 600 : 500, textAlign: "center", background: on ? palette.gold : "transparent", color: on ? palette.letterbox : palette.textMuted, border: "none", boxShadow: on ? `0 2px 8px ${palette.gold}44` : "none" }}>
                    {label}
                  </button>
                );
              })}
            </div>
          );

          const avatarEl = (size) => (
            <div className="relative flex-shrink-0">
              <Avatar name={p.username} size={size} src={avatarSrc} online={p.isOnline} />
              {isMe && (
                <>
                  <input ref={profileAvatarInputRef} type="file" accept="image/*" onChange={handleCommunityAvatarChange} style={{ display: "none" }} />
                  <button
                    type="button"
                    onClick={() => profileAvatarInputRef.current && profileAvatarInputRef.current.click()}
                    disabled={communityAvatarUploading}
                    className={`absolute flex items-center justify-center rounded-full ${TAP}`}
                    style={{ right: "-2px", bottom: "-2px", width: "28px", height: "28px", background: palette.gold, color: palette.letterbox, border: `2px solid ${palette.bg}`, opacity: communityAvatarUploading ? 0.6 : 1 }}
                    aria-label="Change profile photo"
                  >
                    <Camera size={13} />
                  </button>
                </>
              )}
            </div>
          );
          const countsRow = (gap, margin) => (
            <div className="flex items-center" style={{ gap, margin }}>
              {[[p.followerCount, "followers", "followers"], [p.followingCount, "following", "following"]].map(([value, label, kind]) => (
                <button key={kind} type="button" onClick={() => openFollowList(p.username, kind)} aria-label={`See ${label}`} className={TAP} style={{ background: "none", border: "none", outline: "none", boxShadow: "none", WebkitAppearance: "none", appearance: "none", padding: 0, minHeight: "40px", fontFamily: sans, fontSize: "12.5px", color: palette.textMuted, whiteSpace: "nowrap" }}>
                  <b style={{ color: palette.text, fontWeight: 600 }}>{(value || 0).toLocaleString()}</b> {label}
                </button>
              ))}
              <span style={{ fontFamily: sans, fontSize: "12.5px", color: palette.textMuted, whiteSpace: "nowrap" }}>
                <b style={{ color: palette.text, fontWeight: 600 }}>{(p.postCount || 0).toLocaleString()}</b> {p.postCount === 1 ? "post" : "posts"}
              </span>
            </div>
          );
          const actionsRow = () => (isMe ? (
            !bioEditing && (
              <div className="flex" style={{ gap: "8px" }}>
                <button type="button" onClick={() => openEditProfile()} className={`flex items-center justify-center gap-1.5 ${TAP}`} style={isDesktop ? { ...btn(true, false), flex: "none", width: "150px" } : btn(true, false)}>
                  <Pencil size={14} /> Edit profile
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const txt = `${p.username} (@${p.username}) on Ledger.${p.role ? ` ${p.role}.` : ""}${stats.disciplineScore != null ? ` Discipline ${Math.round(stats.disciplineScore)}%` : ""}${stats.journalStreak != null ? `${stats.disciplineScore != null ? "," : ""} ${stats.journalStreak} day journal streak.` : stats.disciplineScore != null ? "." : ""}`;
                    const done = () => { setCopiedProfile(true); setTimeout(() => setCopiedProfile(false), 1600); };
                    const fallback = () => {
                      try {
                        const ta = document.createElement("textarea");
                        ta.value = txt; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
                        document.body.appendChild(ta); ta.select();
                        const ok = document.execCommand("copy");
                        document.body.removeChild(ta);
                        if (ok) done();
                      } catch (e) { /* nothing more to try */ }
                    };
                    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, fallback); else fallback();
                  }}
                  className={`flex items-center justify-center gap-1.5 ${TAP}`}
                  style={isDesktop ? { ...btn(false, false), flex: "none", width: "150px" } : btn(false, false)}
                >
                  <Copy size={14} /> {copiedProfile ? "Copied" : "Copy summary"}
                </button>
              </div>
            )
          ) : (
            <div className="flex" style={{ gap: "8px" }}>
              <button type="button" onClick={() => toggleFollowMember(p.username, !!p.isFollowedByMe)} disabled={followBusy} className={TAP} style={btn(!p.isFollowedByMe, followBusy)}>
                {p.isFollowedByMe ? "Following" : p.followsMe ? "Follow back" : "Follow"}
              </button>
            </div>
          ));

          // Phone: compact header. (Bio and Description are shown in the About block below.)
          const headerBlock = (
            <>
              <div className="flex items-center" style={{ gap: "14px" }}>
                {avatarEl(isDesktop ? 88 : 72)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2" style={{ fontFamily: sans, fontSize: isDesktop ? "26px" : "24px", fontWeight: 600, lineHeight: 1.15, letterSpacing: "-0.01em", color: palette.text }}>
                    <span className="truncate"><PlanName name={p.username} /></span>
                    {p.verifiedPnl && verifiedBadge}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap" style={{ fontFamily: sans, fontSize: "12px", color: palette.textMuted, marginTop: "3px" }}>
                    <span>{`@${p.username}`}{joinedText ? `, Joined ${joinedText}` : ""}</span>
                    {!isMe && p.followsMe && tag("Follows you")}
                  </div>
                </div>
              </div>
              {countsRow("20px", "14px 0 12px")}
              {actionsRow()}
              {!isDesktop && tabsBar}
            </>
          );

          const bioBlock = (
            <>
              {isMe && bioEditing ? (
                <div style={{ marginTop: "14px" }}>
                  <textarea
                    value={bioDraft}
                    onChange={(e) => setBioDraft(e.target.value.slice(0, 160))}
                    rows={3}
                    autoFocus
                    placeholder="Write a short description: what you trade and how you think about risk…"
                    className="w-full outline-none"
                    style={{ display: "block", background: palette.surface, border: `1px solid ${palette.border}`, borderRadius: "12px", padding: "10px 12px", color: palette.text, fontSize: "14px", fontFamily: sans, resize: "none", lineHeight: 1.45 }}
                  />
                  <div className="flex items-center justify-between" style={{ marginTop: "8px" }}>
                    <span style={{ color: palette.textMuted, fontSize: "12px", fontFamily: sans }}>{bioDraft.length}/160</span>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => setBioEditing(false)} className={TAP} style={pill(false, false)}>Cancel</button>
                      <button type="button" onClick={saveProfileBio} disabled={bioSaving} className={TAP} style={pill(true, bioSaving)}>
                        {bioSaving ? "Saving…" : "Save"}
                      </button>
                    </div>
                  </div>
                </div>
              ) : p.bio ? (
                <p style={{ margin: "14px 0 4px", fontFamily: sans, fontSize: "14px", lineHeight: 1.5, color: palette.text, whiteSpace: "pre-wrap" }}>{p.bio}</p>
              ) : isMe ? (
                <p style={{ margin: "14px 0 4px", fontFamily: sans, fontSize: "14px", color: palette.textMuted }}>Add a short description so people know who you are.</p>
              ) : null}
              {profileError && <p style={{ marginTop: "8px", fontFamily: sans, fontSize: "12px", color: palette.red }}>{profileError}</p>}
            </>
          );

          const present = (v) => v != null && v !== "" && !(Array.isArray(v) && v.length === 0);
          const list = (v) => (Array.isArray(v) ? v.join(", ") : String(v));
          const dScore = stats.disciplineScore == null || !Number.isFinite(stats.disciplineScore) ? null : Math.max(0, Math.min(100, Math.round(stats.disciplineScore)));
          const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
          const DOWS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
          const heat = (() => {
            const today = new Date(); today.setHours(0, 0, 0, 0);
            const start = new Date(today); start.setDate(today.getDate() - ((today.getDay() + 6) % 7) - 11 * 7);
            const key = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
            const days = stats.journalDays || {};
            const cells = [];
            let done = 0, past = 0, run = 0, best = 0;
            for (let n = 0; n < 84; n += 1) {
              const d = new Date(start); d.setDate(start.getDate() + n);
              const upcoming = d > today;
              const cnt = upcoming ? -1 : (days[key(d)] || 0);
              cells.push({ n, d, lvl: cnt < 0 ? -1 : Math.min(3, cnt), cnt });
              const wk = d.getDay() !== 0 && d.getDay() !== 6;
              if (!upcoming && wk) { past += 1; if (cnt > 0) { done += 1; run += 1; best = Math.max(best, run); } else run = 0; }
            }
            let pm = -1;
            const months = Array.from({ length: 12 }, (_, col) => { const m = cells[col * 7].d.getMonth(); const t = m !== pm ? MONTHS[m] : ""; pm = m; return t; });
            return { cells, done, past, best, months };
          })();
          const selCell = hmSel >= 0 ? heat.cells[hmSel] : null;
          const heatInfo = selCell
            ? <><b style={{ fontWeight: 600, color: palette.text }}>{DOWS[selCell.d.getDay()]} {selCell.d.getDate()} {MONTHS[selCell.d.getMonth()]}</b>, {selCell.lvl < 0 ? "upcoming" : selCell.cnt === 0 ? "no journal entry" : `${selCell.cnt} ${selCell.cnt > 1 ? "entries" : "entry"} written`}</>
            : "Tap a square to see that day";
          const heatBg = (lvl) => (lvl > 0 ? `color-mix(in srgb, ${palette.gold} ${lvl * 30}%, ${palette.field})` : palette.field);
          const tradingRows = [["Style", p.style || p.styles], ["Markets", p.markets || p.market], ["Risk per trade", p.risk || p.riskPerTrade], ["Main session", p.session || p.mainSession]].filter(([, v]) => present(v));
          const setupRows = (stats.setups || []).filter((x) => Array.isArray(x) && x.length >= 2);
          const showHeat = isMe || !!stats.journalDays;
          const privacyLabels = ["Show results as % of balance, never dollars", "Show my streak on my profile", "Show my top setups"];

          const aboutBlock = (
            <>
              {(p.role || p.tagline) ? (
                <>
                  <div style={{ fontFamily: sans, fontSize: "12px", fontWeight: 500, color: palette.textMuted, margin: isDesktop ? "0 0 6px" : "18px 0 4px" }}>Bio</div>
                  <div style={{ fontFamily: sans, fontSize: "14.5px", fontWeight: 600, color: palette.text, lineHeight: 1.4 }}>{p.role || p.tagline}</div>
                </>
              ) : null}
              {(p.bio || bioEditing || isMe) && (
                <div style={{ fontFamily: sans, fontSize: "12px", fontWeight: 500, color: palette.textMuted, margin: (p.role || p.tagline) ? "18px 0 0" : (isDesktop ? "0" : "18px 0 0") }}>Description</div>
              )}
              {bioBlock}
              {!isMe && mutuals.length > 0 && (
                <div style={{ padding: "12px 0", borderBottom: `1px solid ${palette.border}`, fontFamily: sans, fontSize: "14px", color: palette.textMuted }}>
                  Followed by{" "}
                  {mutuals.slice(0, 2).map((name, i) => (
                    <span key={name}>
                      {i > 0 && ", "}
                      <button type="button" onClick={() => openCommunityMemberProfile(name)} className={TAP} style={{ background: "none", border: "none", padding: 0, color: palette.text, fontWeight: 600, fontSize: "14px" }}>{name}</button>
                    </span>
                  ))}
                  {mutuals.length > 2 && ` and ${mutuals.length - 2} other${mutuals.length - 2 === 1 ? "" : "s"} you follow`}
                </div>
              )}
              {tradingRows.length > 0 && (
                <>
                  {lb("Trading profile")}
                  {tradingRows.map(([label, v]) => rowItem(label, list(v)))}
                </>
              )}
            </>
          );
          const dScoreBlock = (
            <>
              {dScore != null && (
                <>
                  {lb("Discipline score", stats.journalStreak != null ? `${stats.journalStreak} day journal streak` : null)}
                  <div style={{ fontFamily: sans, fontSize: "44px", fontWeight: 600, lineHeight: 1.1, letterSpacing: "-0.02em", color: palette.text }}>{dScore}%</div>
                  <div style={{ marginTop: "8px", height: "10px", borderRadius: "5px", background: palette.field, overflow: "hidden" }}>
                    <i style={{ display: "block", height: "100%", width: `${dScore}%`, borderRadius: "5px", background: palette.gold }} />
                  </div>
                </>
              )}
            </>
          );
          const heatBlock = (
            <>
              {showHeat && (
                <>
                  {lb("Journaling, last 12 weeks")}
                  <div>
                  <div className="flex items-center justify-between" style={{ marginBottom: "10px", fontFamily: sans }}>
                    <span>
                      <b style={{ fontSize: "14px", fontWeight: 600, color: palette.text }}>{heat.done} of {heat.past} days journaled</b>
                      <div style={{ fontSize: "12px", color: palette.textMuted }}>Longest weekday streak: {heat.best} days</div>
                    </span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "30px 1fr", gap: "3px 6px", fontSize: "11px", color: palette.textMuted, fontFamily: sans }}>
                    <div />
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: "3px", height: "16px" }}>
                      {heat.months.map((m, k) => <span key={k} style={{ whiteSpace: "nowrap" }}>{m}</span>)}
                    </div>
                    <div style={{ display: "grid", gridTemplateRows: "repeat(7, 24px)", gap: "3px", alignItems: "center" }}>
                      {["Mon", "", "Wed", "", "Fri", "", ""].map((x, k) => <span key={k}>{x}</span>)}
                    </div>
                    <div role="group" aria-label="Journaling activity over the last 12 weeks" style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: "3px" }}>
                      {Array.from({ length: 84 }, (_, k) => {
                        const r = Math.floor(k / 12), col = k % 12, cell = heat.cells[col * 7 + r];
                        const sel = hmSel === cell.n;
                        return (
                          <button
                            key={cell.n}
                            type="button"
                            onClick={() => setHmSel(cell.n)}
                            aria-label={`${DOWS[cell.d.getDay()]} ${cell.d.getDate()} ${MONTHS[cell.d.getMonth()]}${cell.lvl < 0 ? ", upcoming" : cell.lvl ? ", journaled" : ", not journaled"}`}
                            style={{ height: "24px", borderRadius: "6px", padding: 0, background: cell.lvl < 0 ? "none" : heatBg(cell.lvl), border: sel ? `1.5px solid ${palette.gold}` : cell.lvl < 0 ? `1px dashed ${palette.border}` : "1.5px solid transparent" }}
                          />
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex items-center justify-between" style={{ marginTop: "10px", fontFamily: sans, fontSize: "12px", color: palette.textMuted }}>
                    <span>{heatInfo}</span>
                    <span className="flex items-center" style={{ gap: "4px" }}>
                      Less
                      {[0, 1, 2, 3].map((k) => <i key={k} style={{ width: "12px", height: "12px", borderRadius: "3px", display: "inline-block", background: heatBg(k) }} />)}
                      More
                    </span>
                  </div>
                  </div>
                </>
              )}
            </>
          );
          const setupsBlock = (
            <>
              {setupRows.length > 0 && (
                <>
                  {lb("Best setups by win rate")}
                  {setupRows.map(([name, pct]) => (
                    <div key={name} style={{ display: "grid", gridTemplateColumns: "90px 1fr 78px", gap: "10px", alignItems: "center", padding: "7px 0", fontFamily: sans, fontSize: "13px", color: palette.text }}>
                      <span className="truncate">{name}</span>
                      <i style={{ display: "block", height: "10px", borderRadius: "5px", width: `${pct}%`, background: palette.green }} />
                      <span style={{ textAlign: "right" }}>{pct}%</span>
                    </div>
                  ))}
                </>
              )}
            </>
          );
          const privacyBlock = (
            <>
              {isMe && (
                <>
                  {lb("Privacy")}
                  {privacyLabels.map((label, i) => (
                    <button key={label} type="button" onClick={() => togglePvt(i)} className={`flex items-center justify-between gap-3 w-full text-left ${TAP}`} style={{ padding: "12px 0", minHeight: "44px", background: "none", border: "none", borderBottom: `1px solid ${palette.border}`, fontFamily: sans, fontSize: "14px", color: palette.text }}>
                      <span>{label}</span>
                      <span className="flex items-center justify-center flex-shrink-0" style={{ width: "24px", height: "24px", borderRadius: "50%", border: `1.5px solid ${pvt[i] ? palette.gold : palette.border}`, background: pvt[i] ? palette.gold : "transparent", color: palette.letterbox }}>
                        {pvt[i] && <Check size={14} strokeWidth={3} />}
                      </span>
                    </button>
                  ))}
                </>
              )}
            </>
          );
          const overviewRest = <>{dScoreBlock}{heatBlock}{setupsBlock}{privacyBlock}</>;

          const overviewPanel = <>{aboutBlock}{overviewRest}</>;
          const card = (children) => (
            <div style={isDesktop ? { background: palette.surface, border: `1px solid ${palette.border}`, borderRadius: "18px", padding: "4px 24px 22px", marginBottom: "18px", boxShadow: palette.shadow } : undefined}>{children}</div>
          );
          const pctVal = (v, signed) => (v == null || !Number.isFinite(v) ? "—" : signed ? fmtPct(v) : `${Math.abs(v).toFixed(1)}%`);
          const curveBlock = (
            <>
              {lb("Equity curve across every group", curve.length ? <span style={{ color: pnlColor }}>{fmtPct(stats.pnlPct)}</span> : null)}
              {curveLine ? (
                <svg viewBox="0 0 330 120" preserveAspectRatio="none" role="img" aria-label="Cumulative equity curve" style={{ display: "block", width: "100%", height: isDesktop ? "230px" : "120px" }}>
                  <line x1="0" x2="330" y1={cy(0)} y2={cy(0)} stroke={palette.border} strokeDasharray="4 4" />
                  <polygon points={`0,${cy(0)} ${curveLine} 330,${cy(0)}`} fill={palette.green} fillOpacity="0.12" />
                  <polyline points={curveLine} fill="none" stroke={palette.green} strokeWidth="2" vectorEffect="non-scaling-stroke" />
                </svg>
              ) : (
                <div className="flex items-center justify-center" style={{ height: "120px", color: palette.textMuted, fontFamily: sans, fontSize: "13px" }}>No public curve available</div>
              )}
            </>
          );
          const statsPanel = (
            <>
              {curveBlock}
              {lb("Performance")}
              <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "1fr 1fr" : "1fr", columnGap: "40px" }}>
              {rowItem("Expectancy", stats.avgR == null ? "—" : `${stats.avgR >= 0 ? "+" : "−"}${Math.abs(stats.avgR).toFixed(1)}R`)}
              {rowItem("Win rate", stats.winRate == null || !Number.isFinite(stats.winRate) ? "—" : `${Math.round(stats.winRate)}%`)}
              {rowItem("Profit factor", stats.profitFactor == null || !Number.isFinite(stats.profitFactor) ? "n/a" : stats.profitFactor.toFixed(1))}
              {rowItem("Average win", pctVal(stats.avgWinPct, true))}
              {rowItem("Average loss", pctVal(stats.avgLossPct, true))}
              {rowItem("Max drawdown", stats.maxDrawdownPct == null || !Number.isFinite(stats.maxDrawdownPct) ? "—" : `−${Math.abs(stats.maxDrawdownPct).toFixed(1)}%`)}
              {rowItem("Trades logged", stats.trades == null ? "—" : String(stats.trades))}
              </div>
              {lb("Discipline")}
              {rowItem("Discipline score", dScore == null ? "—" : `${dScore}%`)}
              {rowItem("Journal streak", stats.journalStreak == null ? "—" : `${stats.journalStreak} days`)}
              {rowItem("Best weekday streak", stats.bestStreak == null ? "—" : `${stats.bestStreak} days`)}
              <div className="flex items-center" style={{ gap: "8px", marginTop: "14px", fontFamily: sans, fontSize: "12px", color: palette.textMuted }}>
                {verifiedBadge}
                <span>Stats come from journaled trades. Results are shown as percentages, never dollars.</span>
              </div>
              {!isMe && !stats.statsPublic && <p style={{ marginTop: "14px", fontFamily: sans, fontSize: "12px", color: palette.textMuted }}>{p.username} hasn't shared public performance stats.</p>}
            </>
          );

          const BADGE_CATALOG = [
            ["7-day streak", "Journal 7 sessions in a row"],
            ["30-day streak", "Journal 30 sessions in a row"],
            ["First 100 trades", "Log 100 trades"],
            ["No revenge week", "A full week without a revenge trade"],
            ["Strict stops", "Never move a stop for 20 trades"],
            ["Process first", "Keep a discipline score of 80% or more for a month"],
          ];
          const given = Array.isArray(p.badges) ? p.badges.map((b) => (typeof b === "string" ? b : b?.name)) : [];
          const bestRun = Math.max(stats.journalStreak || 0, stats.bestStreak || 0);
          const hasBadge = (name) => given.includes(name)
            || (name === "7-day streak" && bestRun >= 7)
            || (name === "30-day streak" && bestRun >= 30)
            || (name === "First 100 trades" && (stats.trades || 0) >= 100);
          const earnedCount = BADGE_CATALOG.filter(([n]) => hasBadge(n)).length;
          const badgesPanel = (
            <>
              {lb(`${earnedCount} of ${BADGE_CATALOG.length} earned`)}
              {BADGE_CATALOG.map(([name, desc]) => {
                const e = hasBadge(name);
                return (
                  <div key={name} className="flex items-center justify-between gap-3" style={{ padding: "12px 0", minHeight: "44px", borderBottom: `1px solid ${palette.border}`, fontFamily: sans }}>
                    <span style={{ minWidth: 0 }}>
                      <b style={{ fontSize: "14px", fontWeight: 600, color: e ? palette.text : palette.textMuted }}>{name}</b>
                      <div style={{ fontSize: "12px", color: palette.textMuted }}>{desc}</div>
                    </span>
                    <span className="flex items-center justify-center flex-shrink-0" style={{ width: "24px", height: "24px", borderRadius: "50%", border: `1.5px solid ${e ? palette.gold : palette.border}`, background: e ? palette.gold : "transparent", color: palette.letterbox }}>
                      {e && <Check size={14} strokeWidth={3} />}
                    </span>
                  </div>
                );
              })}
            </>
          );

          const postsPanel = !profilePostsLoaded ? (
            <p style={{ padding: "24px 0", fontFamily: sans, fontSize: "14px", color: palette.textMuted }}>Loading posts…</p>
          ) : profilePosts.length === 0 ? (
            <div className="flex flex-col items-center text-center" style={{ padding: "36px 0" }}>
              <p style={{ fontFamily: sans, fontSize: "14px", color: palette.textMuted, maxWidth: "260px" }}>
                {isMe ? "No posts yet. Share your first post and it'll show up here." : `${p.username} hasn't posted yet.`}
              </p>
              {isMe && (
                <button type="button" onClick={() => setProfileComposerOpen(true)} className={`flex items-center justify-center gap-1.5 ${TAP}`} style={{ ...btn(true, false), flex: "none", padding: "0 20px", marginTop: "14px" }}>
                  <Plus size={15} /> Share a post
                </button>
              )}
            </div>
          ) : (
            <>
              {isMe && (
                <button type="button" onClick={() => setProfileComposerOpen(true)} className={`flex items-center justify-center gap-1.5 ${TAP}`} style={{ ...btn(false, false), width: "100%", flex: "none", marginTop: "14px" }}>
                  <Plus size={15} /> New post
                </button>
              )}
              <div style={isDesktop ? { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "16px", marginTop: "12px", alignItems: "start" } : undefined}>
              {profilePosts.map((post) => (
                <article key={post.id} style={{ background: palette.surface, border: `1px solid ${palette.border}`, borderRadius: "16px", padding: "16px", marginTop: isDesktop ? 0 : "12px" }}>
                  <div className="flex items-center" style={{ gap: "10px" }}>
                    <Avatar name={post.author || p.username} size={40} src={avatarSrc} />
                    <div className="flex flex-col min-w-0" style={{ lineHeight: 1.3 }}>
                      <b className="truncate" style={{ fontFamily: sans, fontSize: "14px", fontWeight: 600, color: palette.text }}>{post.author || p.username}</b>
                      <span style={{ fontFamily: sans, fontSize: "12px", color: palette.textMuted }}>{feedTimeAgo(post.ts)}</span>
                    </div>
                  </div>
                  <button type="button" onClick={() => setProfilePostOpen(post)} className={`block w-full text-left ${TAP}`} style={{ background: "none", border: "none", padding: 0, marginTop: "12px" }} aria-label="Open post">
                    <PostContent text={post.text} image={post.image} clamp />
                  </button>
                  <div className="flex items-center" style={{ gap: "4px", marginTop: "14px", paddingTop: "8px", borderTop: `1px solid ${palette.border}` }}>
                    <button type="button" onClick={() => likeProfilePost(post.id)} className={`flex items-center ${TAP}`} aria-label={post.liked ? "Remove helpful" : "Mark helpful"} aria-pressed={!!post.liked} style={{ gap: "6px", minHeight: "40px", padding: "0 10px", borderRadius: "10px", background: post.liked ? `${palette.gold}29` : "transparent", border: "none", color: post.liked ? palette.gold : palette.textMuted, fontFamily: sans, fontSize: "13px", fontWeight: 500 }}>
                      <HelpfulIcon /> Helpful {post.likeCount || 0}
                    </button>
                    <button type="button" onClick={() => setProfilePostOpen(post)} className={`flex items-center ${TAP}`} aria-label="Open comments" style={{ gap: "6px", minHeight: "40px", padding: "0 10px", borderRadius: "10px", background: "transparent", border: "none", color: palette.textMuted, fontFamily: sans, fontSize: "13px", fontWeight: 500 }}>
                      <MessageCircle size={16} /> {post.commentCount || 0} {(post.commentCount || 0) === 1 ? "comment" : "comments"}
                    </button>
                  </div>
                </article>
              ))}
              </div>
              {profilePostsNext && (
                <button type="button" onClick={loadMoreProfilePosts} className={TAP} style={{ ...btn(false, false), width: "100%", flex: "none", marginTop: "14px" }}>Load more</button>
              )}
            </>
          );

          const panel = tab === "overview" ? overviewPanel : tab === "stats" ? statsPanel : tab === "badges" ? badgesPanel : postsPanel;

          // ---------- Laptop / desktop: header card on top, then a balanced card grid ----------
          const dcard = (children, span, extra) => (
            <div style={{ gridColumn: `span ${span}`, minWidth: 0, background: palette.surface, border: `1px solid ${palette.border}`, borderRadius: "18px", padding: "4px 22px 20px", boxShadow: palette.shadow, ...extra }}>{children}</div>
          );
          const grid12 = (kids) => <div style={{ display: "grid", gridTemplateColumns: "repeat(12, minmax(0, 1fr))", gap: "20px", alignItems: "stretch" }}>{kids}</div>;
          const kpiCard = (label, value, sub, color, bar) => dcard(
            <div style={{ paddingTop: "18px", fontFamily: sans }}>
              <div style={{ fontSize: "12.5px", fontWeight: 500, color: palette.textMuted }}>{label}</div>
              <div style={{ fontSize: "34px", fontWeight: 600, lineHeight: 1.15, letterSpacing: "-0.02em", marginTop: "6px", color: color || palette.text }}>{value}</div>
              {bar != null && <div style={{ marginTop: "12px", height: "8px", borderRadius: "4px", background: palette.field, overflow: "hidden" }}><i style={{ display: "block", height: "100%", width: `${bar}%`, borderRadius: "4px", background: palette.gold }} /></div>}
              {sub ? <div style={{ fontSize: "12px", color: palette.textMuted, marginTop: "10px" }}>{sub}</div> : null}
            </div>,
            3
          );
          const winRateTxt = stats.winRate == null || !Number.isFinite(stats.winRate) ? "—" : `${Math.round(stats.winRate)}%`;
          const perf = [
            ["Expectancy", stats.avgR == null ? "—" : `${stats.avgR >= 0 ? "+" : "−"}${Math.abs(stats.avgR).toFixed(1)}R`],
            ["Win rate", winRateTxt],
            ["Profit factor", stats.profitFactor == null || !Number.isFinite(stats.profitFactor) ? "n/a" : stats.profitFactor.toFixed(1)],
            ["Average win", pctVal(stats.avgWinPct, true)],
            ["Average loss", pctVal(stats.avgLossPct, true)],
            ["Max drawdown", stats.maxDrawdownPct == null || !Number.isFinite(stats.maxDrawdownPct) ? "—" : `−${Math.abs(stats.maxDrawdownPct).toFixed(1)}%`],
            ["Trades logged", stats.trades == null ? "—" : String(stats.trades)],
          ];
          const perfTiles = (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "12px" }}>
              {perf.map(([l, v]) => (
                <div key={l} style={{ border: `1px solid ${palette.border}`, borderRadius: "14px", padding: "14px 16px", background: palette.field, fontFamily: sans }}>
                  <div style={{ fontSize: "12px", color: palette.textMuted }}>{l}</div>
                  <div style={{ fontSize: "22px", fontWeight: 600, marginTop: "4px", color: palette.text }}>{v}</div>
                </div>
              ))}
            </div>
          );
          const headerDesktop = (
            <section style={{ background: palette.surface, border: `1px solid ${palette.border}`, borderRadius: "20px", boxShadow: palette.shadow, padding: "26px 30px", display: "flex", alignItems: "center", gap: "28px", flexWrap: "wrap" }}>
              {avatarEl(100)}
              <div className="flex-1 min-w-0" style={{ minWidth: "240px" }}>
                <div className="flex items-center gap-2" style={{ fontFamily: sans, fontSize: "30px", fontWeight: 600, lineHeight: 1.15, letterSpacing: "-0.015em", color: palette.text }}>
                  <span className="truncate"><PlanName name={p.username} /></span>
                  {p.verifiedPnl && verifiedBadge}
                </div>
                <div className="flex items-center gap-2 flex-wrap" style={{ fontFamily: sans, fontSize: "13.5px", color: palette.textMuted, marginTop: "5px" }}>
                  <span>{`@${p.username}`}{joinedText ? `, Joined ${joinedText}` : ""}</span>
                  {!isMe && p.followsMe && tag("Follows you")}
                </div>
                {countsRow("20px", "10px 0 0")}
              </div>
              <div style={{ flex: "none" }}>{actionsRow()}</div>
            </section>
          );
          const desktopOverview = grid12(
            <>
              {kpiCard("Discipline score", dScore == null ? "—" : `${dScore}%`, stats.journalStreak != null ? `${stats.journalStreak} day journal streak` : null, null, dScore)}
              {kpiCard("Win rate", winRateTxt, stats.trades != null ? `${stats.trades} trades logged` : null)}
              {kpiCard("Equity change", curve.length ? fmtPct(stats.pnlPct) : "—", "Across every group, shown as a percentage", curve.length ? pnlColor : null)}
              {kpiCard("Journaled", `${heat.done}/${heat.past}`, "Weekdays in the last 12 weeks")}
              {dcard(curveBlock, 8)}
              {dcard(<div style={{ paddingTop: "22px" }}>{aboutBlock}</div>, 4)}
              {showHeat && dcard(<div style={{ marginTop: "-14px" }}>{heatBlock}</div>, setupRows.length > 0 ? 7 : 12)}
              {setupRows.length > 0 && dcard(<div style={{ marginTop: "-14px" }}>{setupsBlock}</div>, showHeat ? 5 : 12)}
              {isMe && dcard(<div style={{ marginTop: "-14px" }}>{privacyBlock}</div>, 12)}
            </>
          );
          const desktopStats = grid12(
            <>
              {dcard(curveBlock, 8)}
              {dcard(
                <>
                  {lb("Discipline")}
                  {rowItem("Discipline score", dScore == null ? "—" : `${dScore}%`)}
                  {rowItem("Journal streak", stats.journalStreak == null ? "—" : `${stats.journalStreak} days`)}
                  {rowItem("Best weekday streak", stats.bestStreak == null ? "—" : `${stats.bestStreak} days`)}
                </>,
                4
              )}
              {dcard(<>{lb("Performance")}{perfTiles}</>, 12)}
              <div className="flex items-center" style={{ gridColumn: "span 12", gap: "8px", fontFamily: sans, fontSize: "12px", color: palette.textMuted }}>
                {verifiedBadge}
                <span>Stats come from journaled trades. Results are shown as percentages, never dollars.</span>
              </div>
              {!isMe && !stats.statsPublic && <p style={{ gridColumn: "span 12", margin: 0, fontFamily: sans, fontSize: "12px", color: palette.textMuted }}>{p.username} hasn't shared public performance stats.</p>}
            </>
          );
          const desktopBadges = (
            <>
              <div style={{ fontFamily: sans, fontSize: "13px", fontWeight: 500, color: palette.textMuted, margin: "0 0 12px" }}>{earnedCount} of {BADGE_CATALOG.length} earned</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "16px" }}>
                {BADGE_CATALOG.map(([name, desc]) => {
                  const e = hasBadge(name);
                  return (
                    <div key={name} style={{ background: palette.surface, border: `1px solid ${e ? palette.gold : palette.border}`, borderRadius: "16px", padding: "18px 20px", boxShadow: palette.shadow, fontFamily: sans, display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
                      <span style={{ minWidth: 0 }}>
                        <b style={{ fontSize: "15px", fontWeight: 600, color: e ? palette.text : palette.textMuted }}>{name}</b>
                        <div style={{ fontSize: "12.5px", color: palette.textMuted, marginTop: "3px" }}>{desc}</div>
                      </span>
                      <span className="flex items-center justify-center flex-shrink-0" style={{ width: "26px", height: "26px", borderRadius: "50%", border: `1.5px solid ${e ? palette.gold : palette.border}`, background: e ? palette.gold : "transparent", color: palette.letterbox }}>
                        {e && <Check size={15} strokeWidth={3} />}
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          );
          if (isDesktop) {
            return shell(
              <>
                {headerDesktop}
                {tabsBar}
                {tab === "overview" ? desktopOverview : tab === "stats" ? desktopStats : tab === "badges" ? desktopBadges : postsPanel}
              </>
            );
          }
          return shell(
            <>
              {headerBlock}
              {panel}
            </>
          );
        })()}

        {followListOpen && (() => {
          const fl = followListOpen;
          const known = profileData && String(profileData.username).toLowerCase() === String(fl.username).toLowerCase() ? profileData : null;
          const q = followListQuery.trim().toLowerCase();
          const rows = q ? followListData.filter((r) => String(r.username).toLowerCase().includes(q)) : followListData;
          const tabs = [["followers", "Followers", known ? known.followerCount : null], ["following", "Following", known ? known.followingCount : null]];
          return (
            <div className="fixed inset-0 flex justify-center" style={{ alignItems: isDesktop ? "center" : "flex-end", padding: isDesktop ? "16px" : 0, background: "rgba(5,7,12,0.78)", backdropFilter: "blur(5px)", WebkitBackdropFilter: "blur(5px)", zIndex: 115 }} onClick={() => setFollowListOpen(null)}>
              <div
                className="w-full overflow-hidden"
                style={{ maxWidth: "440px", height: isDesktop ? "min(580px, 84vh)" : "82vh", display: "flex", flexDirection: "column", background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow, borderRadius: isDesktop ? "16px" : "18px 18px 0 0", paddingBottom: isDesktop ? 0 : "env(safe-area-inset-bottom, 0px)" }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Title */}
                <div className="flex items-center justify-between px-4 flex-shrink-0" style={{ height: "52px" }}>
                  <span style={{ width: "30px" }} />
                  <span className="truncate" style={{ color: palette.text, fontSize: "15px", fontWeight: 700 }}><PlanName name={fl.username} /></span>
                  <button type="button" onClick={() => setFollowListOpen(null)} className={`flex items-center justify-center rounded-full ${TAP}`} style={{ width: "30px", height: "30px", background: palette.field, color: palette.textMuted }} aria-label="Close">
                    <X size={15} />
                  </button>
                </div>

                {/* Followers | Following */}
                <div className="flex flex-shrink-0" role="tablist" aria-label="Follow lists" style={{ borderBottom: `1px solid ${palette.border}` }}>
                  {tabs.map(([kind, label, count]) => {
                    const on = fl.kind === kind;
                    return (
                      <button key={kind} type="button" role="tab" aria-selected={on} onClick={() => { if (!on) openFollowList(fl.username, kind); }} className={`flex-1 ${TAP}`} style={{ position: "relative", height: "44px", background: "none", border: "none", color: on ? palette.text : palette.textFaint, fontSize: "13px", fontWeight: on ? 700 : 600, fontFamily: sans }}>
                        {label}{count != null ? <span style={{ marginLeft: "6px", fontFamily: mono, fontSize: "12px", color: on ? palette.gold : palette.textFaint }}>{count}</span> : null}
                        <span aria-hidden="true" style={{ position: "absolute", left: "20%", right: "20%", bottom: "-1px", height: "2px", borderRadius: "2px 2px 0 0", background: palette.gold, opacity: on ? 1 : 0, transition: "opacity 0.15s" }} />
                      </button>
                    );
                  })}
                </div>

                {/* Search */}
                <div className="px-4 py-3 flex-shrink-0">
                  <div className="flex items-center gap-2 rounded-xl px-3" style={{ height: "38px", background: palette.field, border: `1px solid ${palette.border}` }}>
                    <Search size={15} style={{ color: palette.textFaint, flexShrink: 0 }} />
                    <input
                      type="text"
                      value={followListQuery}
                      onChange={(e) => setFollowListQuery(e.target.value)}
                      placeholder="Search"
                      className="flex-1 bg-transparent outline-none"
                      style={{ color: palette.text, fontSize: "13.5px", fontFamily: sans, minWidth: 0 }}
                    />
                    {followListQuery && (
                      <button type="button" onClick={() => setFollowListQuery("")} className={TAP} style={{ background: "none", border: "none", padding: 0, color: palette.textFaint, display: "flex" }} aria-label="Clear search">
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* List */}
                <div style={{ flex: "1 1 auto", overflowY: "auto", minHeight: 0 }}>
                  {followListLoading ? (
                    <p className="px-4 py-3" style={{ color: palette.textFaint, fontSize: "12.5px" }}>Loading…</p>
                  ) : rows.length === 0 ? (
                    <div className="flex flex-col items-center text-center px-8" style={{ paddingTop: "48px" }}>
                      <span className="flex items-center justify-center rounded-full" style={{ width: "56px", height: "56px", background: `${palette.gold}14`, border: `1px solid ${palette.gold}33` }}>
                        <Users size={24} style={{ color: palette.gold }} />
                      </span>
                      <p style={{ color: palette.text, fontSize: "14px", fontWeight: 700, marginTop: "14px" }}>
                        {q ? "No results" : fl.kind === "followers" ? "No followers yet" : "Not following anyone yet"}
                      </p>
                      <p style={{ color: palette.textFaint, fontSize: "12px", marginTop: "4px" }}>
                        {q ? `Nobody matches “${followListQuery.trim()}”.` : fl.kind === "followers" ? "When people follow this account, they'll show up here." : "Accounts this person follows will show up here."}
                      </p>
                    </div>
                  ) : (
                    rows.map((row) => {
                      const rowIsMe = row.username === communityUsername;
                      return (
                        <div key={row.username} className="flex items-center gap-3 w-full px-4" style={{ minHeight: "64px" }}>
                          <button
                            type="button"
                            onClick={() => { setFollowListOpen(null); openCommunityMemberProfile(row.username); }}
                            className={`flex items-center gap-3 flex-1 min-w-0 ${TAP}`}
                            style={{ background: "none", border: "none", textAlign: "left", padding: 0 }}
                          >
                            <Avatar name={row.username} size={44} src={row.avatar || avatarForAuthor(row.username)} online={isAuthorOnline(row.username)} />
                            <span className="truncate" style={{ color: palette.text, fontSize: "14px", fontWeight: 700 }}><PlanName name={row.username} /></span>
                          </button>
                          {!rowIsMe && (
                            <button
                              type="button"
                              onClick={() => toggleFollowMember(row.username, !!row.isFollowedByMe)}
                              disabled={followBusy}
                              className={`flex-shrink-0 ${TAP}`}
                              style={{
                                height: "32px", minWidth: "92px", padding: "0 16px", borderRadius: "8px",
                                background: row.isFollowedByMe ? `${palette.gold}16` : palette.gold,
                                border: `1px solid ${row.isFollowedByMe ? `${palette.gold}55` : "transparent"}`,
                                color: row.isFollowedByMe ? palette.gold : palette.letterbox,
                                fontSize: "12.5px", fontWeight: 700, fontFamily: sans, opacity: followBusy ? 0.6 : 1,
                              }}
                            >
                              {row.isFollowedByMe ? "Following" : "Follow"}
                            </button>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {lightboxPost && (() => {
          const po = globalFeed.find((p) => p.id === lightboxPost.id) || lightboxPost;
          return (
            <div className="fixed inset-0 flex flex-col" style={{ background: "#000", zIndex: 150 }} onClick={() => setLightboxPost(null)}>
              <div className="flex items-center gap-3 px-4 flex-shrink-0" style={{ height: "52px", paddingTop: "env(safe-area-inset-top, 0px)" }} onClick={(e) => e.stopPropagation()}>
                <button type="button" onClick={() => setLightboxPost(null)} className={`flex items-center justify-center rounded-full flex-shrink-0 ${TAP}`} style={{ width: "32px", height: "32px", color: "#FFFFFF" }} aria-label="Close">
                  <X size={20} />
                </button>
                <Avatar name={po.author} size={30} src={po.avatar || avatarForAuthor(po.author)} />
                <div className="flex-1 min-w-0">
                  <div style={{ color: "#FFFFFF", fontSize: "13px", fontWeight: 800 }}><PlanName name={po.author} /></div>
                  <div style={{ color: "rgba(255,255,255,0.55)", fontSize: "11px" }}>{feedTimeAgo(po.ts)}</div>
                </div>
              </div>
              <div className="flex-1 flex items-center justify-center overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <img src={po.image} alt="Post" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
              </div>
              <div className="flex-shrink-0 px-4 pt-3" style={{ paddingBottom: "calc(14px + env(safe-area-inset-bottom, 0px))" }} onClick={(e) => e.stopPropagation()}>
                {po.text && <div style={{ color: "#FFFFFF", fontSize: "14px", lineHeight: 1.5, marginBottom: "10px", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{plainOf(po.text)}</div>}
                <div className="flex items-center gap-6 -ml-2">
                  <button type="button" onClick={() => likeGlobalFeedPost(po.id)} className={`flex items-center gap-1.5 px-2 py-1.5 rounded-full ${TAP}`} style={{ background: "none", border: "none", color: po.liked ? palette.red : "#FFFFFF" }}>
                    <Heart size={20} fill={po.liked ? "currentColor" : "none"} /><span style={{ fontSize: "13px", fontWeight: 700 }}>{po.likeCount || 0}</span>
                  </button>
                  <button type="button" onClick={() => { setLightboxPost(null); openGlobalFeedComments(po.id); }} className={`flex items-center gap-1.5 px-2 py-1.5 rounded-full ${TAP}`} style={{ background: "none", border: "none", color: "#FFFFFF" }}>
                    <MessageCircle size={20} /><span style={{ fontSize: "13px", fontWeight: 700 }}>{po.commentCount || 0}</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {profilePostOpen && (() => {
          const po = profilePostOpen;
          const canDeletePost = po.author === communityUsername;
          const split = isDesktop && !!po.image;
          const likes = po.likeCount || 0;
          const canSend = !!profileCommentDraft.trim() && !profileCommentSending;
          const postDate = new Date(po.ts);
          const dateLabel = postDate.toLocaleDateString([], { month: "long", day: "numeric", ...(postDate.getFullYear() !== new Date().getFullYear() ? { year: "numeric" } : {}) });
          const EMOJIS = ["😀", "😂", "😍", "🔥", "👏", "🙌", "👍", "💯", "📈", "📉", "💰", "🚀", "😎", "🤝", "🎯", "🙏"];
          const header = (
            <div className="relative flex items-center justify-between px-4 flex-shrink-0" style={{ minHeight: isDesktop ? "76px" : "58px", paddingTop: isDesktop ? 0 : "env(safe-area-inset-top, 0px)", borderBottom: `1px solid ${palette.border}` }}>
              <div className="flex items-center gap-3 min-w-0">
                {!isDesktop && (
                  <button type="button" onClick={() => setProfilePostOpen(null)} className={`flex items-center justify-center flex-shrink-0 ${TAP}`} style={{ width: "32px", height: "32px", background: "none", border: "none", color: palette.text, marginLeft: "-8px" }} aria-label="Back">
                    <ChevronLeft size={22} />
                  </button>
                )}
                <Avatar name={po.author} size={isDesktop ? 44 : 34} src={profileData?.avatar || avatarForAuthor(po.author)} />
                <span className="truncate" style={{ color: palette.text, fontSize: isDesktop ? "15px" : "14px", fontWeight: 700 }}><PlanName name={po.author} /></span>
              </div>
              {canDeletePost && (
                <>
                  <button type="button" onClick={() => setProfilePostMenuOpen((v) => !v)} className={`flex items-center justify-center flex-shrink-0 ${TAP}`} style={{ width: "36px", height: "36px", background: "none", border: "none", color: palette.text }} aria-label="More options" aria-expanded={profilePostMenuOpen}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.9" /><circle cx="12" cy="12" r="1.9" /><circle cx="19" cy="12" r="1.9" /></svg>
                  </button>
                  {profilePostMenuOpen && (
                    <div className="absolute overflow-hidden" style={{ right: "12px", top: "calc(100% - 10px)", zIndex: 5, minWidth: "190px", background: palette.surface, border: `1px solid ${palette.border}`, borderRadius: "12px", boxShadow: palette.shadow }}>
                      <button type="button" onClick={() => { setProfilePostMenuOpen(false); deleteProfilePost(po.id); }} className={`block w-full ${TAP}`} style={{ background: "none", border: "none", borderBottom: `1px solid ${palette.border}`, padding: "13px 16px", textAlign: "left", color: palette.red, fontSize: "13.5px", fontWeight: 700 }}>Delete post</button>
                      <button type="button" onClick={() => setProfilePostMenuOpen(false)} className={`block w-full ${TAP}`} style={{ background: "none", border: "none", padding: "13px 16px", textAlign: "left", color: palette.text, fontSize: "13.5px" }}>Cancel</button>
                    </div>
                  )}
                </>
              )}
            </div>
          );
          // Caption, placed like Instagram: on mobile it sits right under the like count as
          // "username caption"; in the desktop two-pane viewer it is the first entry at the top of
          // the right pane (avatar + username + caption + time), with the comments beneath it.
          const captionRow = po.text ? (
            <div className={split ? "px-4 pt-5 pb-3" : "px-4 pb-2 pt-3"}>
              <PostContent text={po.text} titleSize={split ? 20 : 17} />
              <div style={{ color: palette.textFaint, fontSize: "12px", marginTop: "10px" }}>{feedTimeAgo(po.ts)}</div>
            </div>
          ) : null;
          const thread = (
            <div className="px-4 pt-1 pb-3">
              <div style={{ color: palette.textMuted, fontSize: "12.5px", margin: "12px 0 2px", fontFamily: sans }}>
                {profileCommentsLoading ? "Loading comments…" : `${profileComments.length} ${profileComments.length === 1 ? "comment" : "comments"}`}
              </div>
              {!profileCommentsLoading && profileComments.length === 0 && (
                <div style={{ color: palette.textFaint, fontSize: "13px", padding: split ? "40px 0" : "14px 0", fontFamily: sans }}>No comments yet. Start the conversation.</div>
              )}
              {profileComments.map((c) => {
                const canDeleteComment = c.author === communityUsername || po.author === communityUsername;
                return (
                  <div key={c.id} className="flex" style={{ gap: "10px", marginTop: "14px" }}>
                    <button type="button" onClick={() => { setProfilePostOpen(null); openCommunityMemberProfile(c.author); }} className={`flex-shrink-0 ${TAP}`} style={{ background: "none", border: "none", padding: 0, alignSelf: "flex-start" }} aria-label={`Open ${c.author}'s profile`}>
                      <Avatar name={c.author} size={32} src={c.author === communityUsername ? (communityAvatar || avatarForAuthor(c.author)) : avatarForAuthor(c.author)} />
                    </button>
                    <div className="min-w-0 flex-1" style={{ fontFamily: sans }}>
                      <div className="flex items-center" style={{ gap: "8px" }}>
                        <b style={{ fontSize: "13.5px", color: palette.text }}>@{c.author}</b>
                        <span style={{ color: palette.textMuted, fontSize: "12px" }}>{feedTimeAgo(c.ts)}</span>
                      </div>
                      <div style={{ color: palette.text, fontSize: "14px", lineHeight: 1.45, whiteSpace: "pre-wrap", wordBreak: "break-word", marginTop: "2px" }}>{c.text}</div>
                      {canDeleteComment && (
                        <button type="button" onClick={() => deleteProfileComment(c.id)} className={TAP} style={{ background: "none", border: "none", padding: 0, minHeight: "32px", color: palette.textMuted, fontSize: "12px", fontWeight: 600 }}>Delete</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          );
          const nComments = profileCommentsLoading ? (po.commentCount || 0) : profileComments.length;
          const actions = (
            <div className="px-4 pt-3.5 pb-3 flex-shrink-0" style={{ borderTop: split ? `1px solid ${palette.border}` : "none" }}>
              <div className="flex items-center" style={{ gap: "8px" }}>
                <button type="button" onClick={() => likeProfilePost(po.id)} className={`flex items-center ${TAP}`} aria-label={po.liked ? "Remove helpful" : "Mark helpful"} aria-pressed={!!po.liked} style={{ gap: "6px", minHeight: "40px", padding: "0 14px", borderRadius: "10px", border: "none", background: po.liked ? `${palette.gold}29` : palette.field, color: po.liked ? palette.gold : palette.text, fontSize: "13.5px", fontWeight: 600 }}>
                  <HelpfulIcon size={17} /> Helpful {likes}
                </button>
                <button type="button" onClick={() => profileCommentInputRef.current && profileCommentInputRef.current.focus()} className={`flex items-center ${TAP}`} aria-label="Comment" style={{ gap: "6px", minHeight: "40px", padding: "0 14px", borderRadius: "10px", border: "none", background: palette.field, color: palette.text, fontSize: "13.5px", fontWeight: 600 }}>
                  <MessageCircle size={17} /> {nComments} {nComments === 1 ? "comment" : "comments"}
                </button>
              </div>
              <div style={{ marginTop: "8px", color: palette.textFaint, fontSize: "12.5px" }}>{dateLabel}</div>
            </div>
          );
          const inputBar = (
            <div className="flex-shrink-0" style={{ borderTop: `1px solid ${palette.border}`, padding: "12px 16px", paddingBottom: isDesktop ? "12px" : "calc(12px + env(safe-area-inset-bottom, 0px))" }}>
              <div className="flex" style={{ gap: "8px" }}>
                <input
                  ref={profileCommentInputRef}
                  type="text"
                  value={profileCommentDraft}
                  onChange={(e) => setProfileCommentDraft(e.target.value.slice(0, 500))}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); postProfileComment(); } }}
                  placeholder="Add a comment"
                  aria-label="Comment"
                  style={{ flex: 1, minWidth: 0, height: "44px", background: palette.field, border: `1px solid ${palette.border}`, borderRadius: "12px", padding: "0 12px", color: palette.text, fontSize: "14px", fontFamily: sans, outline: "none" }}
                />
                <button type="button" onClick={postProfileComment} disabled={!canSend} className={TAP} style={{ width: "90px", height: "44px", borderRadius: "12px", border: "none", background: canSend ? palette.gold : palette.field, color: canSend ? palette.letterbox : palette.textFaint, fontSize: "14px", fontWeight: 700 }}>
                  {profileCommentSending ? "Posting…" : "Send"}
                </button>
              </div>
              {profileError && <p style={{ color: palette.red, fontSize: "11.5px", margin: "8px 0 0" }}>{profileError}</p>}
            </div>
          );
          const fullScreen = !isDesktop;
          return (
            <div className="fixed inset-0 flex items-center justify-center" style={{ padding: fullScreen ? 0 : "24px 72px", background: "rgba(5,7,12,0.88)", backdropFilter: "blur(5px)", WebkitBackdropFilter: "blur(5px)", zIndex: 120 }} onClick={() => setProfilePostOpen(null)}>
              {isDesktop && (
                <button type="button" onClick={() => setProfilePostOpen(null)} className={`absolute flex items-center justify-center ${TAP}`} style={{ top: "16px", right: "20px", width: "40px", height: "40px", background: "none", border: "none", color: "#FFFFFF" }} aria-label="Close post">
                  <X size={30} />
                </button>
              )}
              <div
                className="w-full overflow-hidden"
                style={{ maxWidth: fullScreen ? "none" : split ? "1400px" : "560px", height: fullScreen ? "100%" : split ? "min(90vh, 920px)" : "auto", maxHeight: fullScreen ? "none" : "92vh", display: "flex", flexDirection: split ? "row" : "column", background: palette.surface, border: fullScreen ? "none" : `1px solid ${palette.border}`, borderRadius: fullScreen ? 0 : "6px", boxShadow: palette.shadow }}
                onClick={(e) => { e.stopPropagation(); setProfilePostMenuOpen(false); }}
              >
                {split ? (
                  <>
                    <div className="flex items-center justify-center" style={{ flex: 1, minWidth: 0, background: palette.letterbox }}>
                      <img src={po.image} alt="Post attachment" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", display: "block" }} />
                    </div>
                    <div className="flex flex-col" style={{ width: "clamp(440px, 36%, 600px)", flexShrink: 0, minHeight: 0, borderLeft: `1px solid ${palette.border}` }}>
                      {header}
                      <div style={{ flex: "1 1 auto", overflowY: "auto", minHeight: 0 }}>
                        {captionRow}
                        {thread}
                      </div>
                      {actions}
                      {inputBar}
                    </div>
                  </>
                ) : (
                  <>
                    {header}
                    <div style={{ flex: "1 1 auto", overflowY: "auto", minHeight: 0 }}>
                      {po.image && <img src={po.image} alt="Post attachment" style={{ width: "100%", display: "block", maxHeight: fullScreen ? "62vh" : "60vh", objectFit: "contain", background: palette.letterbox }} />}
                      {actions}
                      {captionRow}
                      {thread}
                    </div>
                    {inputBar}
                  </>
                )}
              </div>
            </div>
          );
        })()}

        {profileComposerOpen && (
          <div className="fixed inset-0 flex items-center justify-center" style={{ padding: isDesktop ? "16px" : 0, background: "rgba(5,7,12,0.85)", backdropFilter: "blur(5px)", WebkitBackdropFilter: "blur(5px)", zIndex: 122 }}>
            <div style={{ width: "100%", maxWidth: isDesktop ? "560px" : "none", height: isDesktop ? "min(86vh, 720px)" : "100%", display: "flex", flexDirection: "column", background: palette.bg, borderRadius: isDesktop ? "20px" : 0, overflow: "hidden", paddingTop: isDesktop ? "16px" : "calc(env(safe-area-inset-top, 0px) + 12px)" }}>
              <PostComposer
                username={communityUsername}
                avatar={communityAvatar}
                trades={trades}
                onClose={() => { if (!profilePostSubmitting) setProfileComposerOpen(false); }}
                onSubmit={(v) => createProfilePost(v)}
              />
            </div>
          </div>
        )}
    </>
  );
  
  return body;
}
