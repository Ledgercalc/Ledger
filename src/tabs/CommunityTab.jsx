import { PlanName } from "../components/PlanBadge.jsx";
import { Avatar } from "../components/ui.jsx";
import { FEED_REACTIONS, avatarStyleFor, feedTimeAgo } from "../lib/feed.js";
import { fmt, num } from "../lib/format.js";
import { TAP, display, mono, palette, sans } from "../lib/theme.js";
import { AlertTriangle, Bell, BookOpen, Camera, ChevronDown, ChevronLeft, ChevronRight, FileText, Flame, Heart, HelpCircle, LayoutGrid, Menu, MessageCircle, Newspaper, Pencil, Plus, Search, Send, ShieldAlert, Smile, Sparkles, Sticker, Target, Trash2, TrendingUp, Users, X } from "lucide-react";

export default function CommunityTab(props) {
  const {
    REACTION_EMOJIS,
    activeGroupId,
    addingGroup,
    advanceStory,
    answerGroupQuestion,
    askGroupQuestion,
    authorHasUnseen,
    avatarForAuthor,
    bioDraft,
    bioEditing,
    bioSaving,
    cancelStoryDraft,
    claimCommunityUsername,
    closeProfileBack,
    closeStoryViewer,
    commentDrafts,
    communityApiError,
    communityAvatar,
    communityAvatarUploading,
    communityChatSubView,
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
    deleteStory,
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
    handleStoryImageChange,
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
    myStoryReactions,
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
    openMyProfile,
    openSignalThread,
    openStoryComposer,
    openStoryViewerFor,
    openThreadId,
    pinCommunityMessage,
    pingTyping,
    pinnedMessageId,
    postFeedComment,
    postImageInputRef,
    postImageUploading,
    postProfileComment,
    postStory,
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
    reactionPickerFor,
    relateWallEntry,
    relatedWallIds,
    renderCommunitySearch,
    renderGlobalFeed,
    replyingTo,
    saveProfileBio,
    searchCommunity,
    sendCommunityMessage,
    sendSticker,
    sendThreadReply,
    setActiveGroupId,
    setAddingGroup,
    setBioDraft,
    setBioEditing,
    setCommentDrafts,
    setCommunityChatSubView,
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
    setOpenThreadId,
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
    setReactionPickerFor,
    setReplyingTo,
    setSignalComposerOpen,
    setSignalDirection,
    setSignalEntry,
    setSignalPair,
    setSignalSL,
    setSignalStatsOpen,
    setSignalTP,
    setStickerActivePackId,
    setStickerManageMode,
    setStickerNewPackName,
    setStickerPickerOpen,
    setStoryCaption,
    setStoryPaused,
    setStoryViewer,
    setThreadDraft,
    shadowSignalToTrade,
    signalComposerOpen,
    signalDirection,
    signalEntry,
    signalPair,
    signalSL,
    signalStatsOpen,
    signalTP,
    stickerActivePackId,
    stickerError,
    stickerFileInputRef,
    stickerManageMode,
    stickerNewPackName,
    stickerPacks,
    stickerPacksLoaded,
    stickerPickerOpen,
    stickerUploading,
    storiesByAuthor,
    storyAuthorOrder,
    storyCaption,
    storyDraft,
    storyImageInputRef,
    storyPosting,
    storyProgressPct,
    storyViewer,
    threadDraft,
    threadLoading,
    threadReplies,
    toggleFeedComments,
    toggleFeedReaction,
    toggleFollowMember,
    toggleMessageReaction,
    toggleStoryReaction,
    typingUsers,
    unpinCommunityMessage,
    uploadProfilePostImage
  } = props;
  let body = null;
    // ---------- Reusable chat panel (used standalone on mobile, embedded in split view on desktop) ----------
  const renderChatPanel = (heightStyle) => {
  const group = myGroups.find((g) => g.id === activeGroupId);
  const myMember = groupMembersList.find((m) => m.username === communityUsername);
  const isGroupOwner = group?.role === "owner" || !!myMember?.isOwner;
  const isGroupAdmin = !!myMember?.isAdmin;
  const canPostSignal = isGroupOwner || isGroupAdmin || !!myMember?.isSignalProvider;
  const chatMessages = groupMessages.filter((m) => m.type !== "signal");
  const signalMessages = groupMessages.filter((m) => m.type === "signal");
  const signalProviderStats = (() => {
    const map = {};
    signalMessages.forEach((m) => {
      const key = m.author || "unknown";
      if (!map[key]) map[key] = { author: key, count: 0, buys: 0, sells: 0, rrSum: 0, rrCount: 0 };
      map[key].count += 1;
      if (m.direction === "sell") map[key].sells += 1; else map[key].buys += 1;
      const entryNum = num(m.entry), slNum = num(m.sl), tpNum = num(m.tp);
      if (entryNum && slNum && tpNum && entryNum !== slNum) {
        map[key].rrSum += Math.abs(tpNum - entryNum) / Math.abs(entryNum - slNum);
        map[key].rrCount += 1;
      }
    });
    return Object.values(map).sort((a, b) => b.count - a.count);
  })();
  const groupAvgRR = (() => {
    const withRR = signalProviderStats.filter((p) => p.rrCount > 0);
    if (!withRR.length) return null;
    return withRR.reduce((s, p) => s + p.rrSum / p.rrCount, 0) / withRR.length;
  })();
    return (
      <div className="flex flex-col h-full" style={heightStyle}>
        {/* Header */}
        {(() => {
          const headerMemberCount = groupInfo?.memberCount ?? groupMembersList.length ?? 0;
          const headerMessageCount = groupMessages.length || 0;
          const openGroupInfo = () => {
            setManageNameDraft(group?.name || "");
            setManageDescDraft(group?.description || "");
            setManageMsg("");
            setGroupManageTab("info");
            setGroupManageOpen(true);
          };
          return (
        <div
          className={isDesktop ? "flex items-center gap-3 px-5 py-3.5 flex-shrink-0" : "flex items-center gap-2.5 px-3.5 py-2.5 flex-shrink-0"}
          style={{
            borderBottom: `1px solid ${palette.border}`,
            background: palette.surface,
            borderTopLeftRadius: isDesktop ? "16px" : 0,
            borderTopRightRadius: isDesktop ? "16px" : 0,
          }}
        >
          {!isDesktop && (
            <button
              type="button"
              onClick={() => setActiveGroupId(null)}
              className={`flex items-center justify-center rounded-full flex-shrink-0 ${TAP}`}
              style={{ width: "30px", height: "30px", background: palette.field, border: `1px solid ${palette.border}`, color: palette.textMuted }}
              aria-label="Back to groups"
            >
              <ChevronLeft size={16} />
            </button>
          )}
          <button
            type="button"
            onClick={openGroupInfo}
            className={`flex items-center gap-2.5 flex-1 min-w-0 ${TAP}`}
            style={{ background: "none", border: "none", padding: 0, textAlign: "left" }}
            aria-label="View group info"
          >
            <Avatar name={group ? group.name : "?"} size={isDesktop ? 44 : 38} online src={groupAvatarMap[activeGroupId]} />
            <div className="flex-1 min-w-0">
              <div style={{ fontFamily: display, fontSize: isDesktop ? "16px" : "14.5px", fontWeight: 700, color: palette.text, lineHeight: 1.25 }} className="truncate">
                {group ? group.name : "Group"}
              </div>
              <div style={{ color: palette.textFaint, fontSize: "10.5px", fontFamily: mono, marginTop: "1px" }}>
                {headerMemberCount} member{headerMemberCount === 1 ? "" : "s"} · {headerMessageCount} message{headerMessageCount === 1 ? "" : "s"}
              </div>
            </div>
          </button>
          <button
            type="button"
            onClick={openMyProfile}
            className={`flex items-center justify-center rounded-full flex-shrink-0 ${TAP}`}
            style={{ width: isDesktop ? "34px" : "30px", height: isDesktop ? "34px" : "30px", background: "none", border: "none", padding: 0 }}
            aria-label="My profile"
            title="My profile"
          >
            <Avatar name={communityUsername || "?"} size={isDesktop ? 34 : 30} src={communityAvatar || undefined} />
          </button>
          <button
            type="button"
            onClick={openGroupInfo}
            className={`flex items-center justify-center rounded-full flex-shrink-0 ${TAP}`}
            style={{ width: isDesktop ? "34px" : "30px", height: isDesktop ? "34px" : "30px", background: palette.field, border: `1px solid ${palette.border}`, color: palette.textMuted }}
            aria-label="Group menu"
            title="Group info and members"
          >
            <Menu size={15} />
          </button>
        </div>
          );
        })()}

             {pinnedMessageId && (() => {
          const pinned = groupMessages.find((m) => m.id === pinnedMessageId);
          if (!pinned) return null;
          return (
            <div
              className="flex items-start gap-2 px-4 py-2.5 flex-shrink-0"
              style={{ background: `${palette.gold}12`, borderBottom: `1px solid ${palette.gold}33` }}
            >
              <Bell size={13} style={{ color: palette.gold, marginTop: "2px", flexShrink: 0 }} />
              <div className="flex-1 min-w-0">
                <div style={{ color: palette.gold, fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Pinned · <PlanName name={pinned.author} />
                </div>
                <div className="truncate" style={{ color: palette.text, fontSize: "12.5px" }}>
                  {pinned.type === "signal" ? `${pinned.pair} ${pinned.direction === "sell" ? "Sell" : "Buy"} signal` : pinned.text}
                </div>
              </div>
              {isGroupOwner && (
                <button type="button" onClick={unpinCommunityMessage} className={TAP} style={{ color: palette.textFaint, flexShrink: 0 }} aria-label="Unpin">
                  <X size={13} />
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
            zap: <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />,
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
            { id: "chat", label: "Chat", icon: "chat",
              subs: [{ id: "chat", label: "Messages", icon: "hash" }, { id: "signal", label: "Signals", icon: "zap" }],
              subState: communityChatSubView, setSubState: setCommunityChatSubView },
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
          const padX = isDesktop ? "16px" : "8px";

          return (
            <>
              <style>{`.comm-tabbar{scrollbar-width:none;-ms-overflow-style:none}.comm-tabbar::-webkit-scrollbar{display:none}`}</style>

              {/* Level 1: underline tabs */}
              <div
                className="comm-tabbar flex flex-shrink-0"
                role="tablist"
                aria-label="Group sections"
                style={{ overflowX: "auto", padding: `0 ${padX}`, borderBottom: `1px solid ${palette.border}` }}
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
                        position: "relative",
                        flexShrink: 0,
                        whiteSpace: "nowrap",
                        display: "flex",
                        alignItems: "center",
                        gap: "7px",
                        padding: isDesktop ? "13px 14px" : "12px 12px",
                        background: "none",
                        border: "none",
                        color: active ? palette.text : palette.textMuted,
                        fontFamily: sans,
                        fontSize: isDesktop ? "13px" : "12.5px",
                        fontWeight: active ? 700 : 600,
                      }}
                    >
                      {icon(g.icon, 16, active ? palette.gold : palette.textFaint)}
                      {g.label}
                      <span
                        aria-hidden="true"
                        style={{
                          position: "absolute", left: "10px", right: "10px", bottom: "-1px", height: "2px",
                          borderRadius: "2px 2px 0 0",
                          background: palette.gold,
                          opacity: active ? 1 : 0,
                          transform: active ? "scaleX(1)" : "scaleX(0.4)",
                          transition: "opacity 0.15s, transform 0.15s",
                        }}
                      />
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

         ) : communityPanelTab === "signal" ? (
  <>
    <div className="flex-1 px-4 py-4" style={{ background: palette.bg, overflowY: "auto", minHeight: 0 }}>
      {signalMessages.length > 0 && (
        <div
          className="rounded-2xl mb-4 overflow-hidden"
          style={{ background: palette.surface, border: `1px solid ${palette.border}`, boxShadow: palette.shadow }}
        >
          <button
            type="button"
            onClick={() => setSignalStatsOpen((v) => !v)}
            className={`w-full flex items-center gap-2 px-4 py-3 ${TAP}`}
            style={{ background: "none", border: "none" }}
            aria-expanded={signalStatsOpen}
            aria-label={signalStatsOpen ? "Collapse signal performance" : "Expand signal performance"}
          >
            <span
              className="flex items-center justify-center rounded-lg flex-shrink-0"
              style={{ width: "26px", height: "26px", background: `${palette.gold}17` }}
            >
              <TrendingUp size={13} style={{ color: palette.gold }} />
            </span>
            <span style={{ fontFamily: display, fontSize: "13.5px", fontWeight: 700, color: palette.text }}>
              Signal Performance
            </span>
            {!signalStatsOpen && (
              <span style={{ color: palette.textFaint, fontSize: "10.5px", fontFamily: mono, marginLeft: "2px" }}>
                · {signalMessages.length} signal{signalMessages.length === 1 ? "" : "s"}
              </span>
            )}
            <span className="flex-1" />
            <ChevronDown
              size={15}
              style={{
                color: palette.textFaint,
                transform: signalStatsOpen ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.2s ease",
                flexShrink: 0,
              }}
            />
          </button>

          {signalStatsOpen && (
            <>
              <div className="grid grid-cols-3" style={{ borderTop: `1px solid ${palette.border}`, borderBottom: `1px solid ${palette.border}` }}>
                {[
                  { icon: TrendingUp, value: signalMessages.length, label: "Signals" },
                  { icon: Users, value: signalProviderStats.length, label: "Providers" },
                  { icon: Target, value: groupAvgRR !== null ? `1:${fmt(groupAvgRR, 1)}` : "—", label: "Avg R:R", gold: true },
                ].map(({ icon: Icon, value, label, gold }, i) => (
                  <div
                    key={label}
                    className="flex flex-col items-center justify-center py-3"
                    style={{ borderLeft: i > 0 ? `1px solid ${palette.border}` : "none" }}
                  >
                    <Icon size={13} style={{ color: gold ? palette.gold : palette.textFaint, marginBottom: "4px" }} />
                    <div style={{ color: gold ? palette.gold : palette.text, fontSize: "16px", fontWeight: 800, fontFamily: mono, lineHeight: 1 }}>
                      {value}
                    </div>
                    <div style={{ color: palette.textFaint, fontSize: "9px", fontFamily: sans, textTransform: "uppercase", letterSpacing: "0.05em", marginTop: "3px" }}>
                      {label}
                    </div>
                  </div>
                ))}
              </div>

              {signalProviderStats.length > 0 && (
                <div className="flex gap-2 px-4 py-3" style={{ overflowX: "auto", WebkitOverflowScrolling: "touch", scrollbarWidth: "none" }}>
                  {signalProviderStats.map((p, i) => {
                    const rankColor = i === 0 ? palette.gold : i === 1 ? palette.textMuted : i === 2 ? "#B87333" : palette.textFaint;
                    return (
                      <div
                        key={p.author}
                        className="flex items-center gap-2 rounded-xl pl-1.5 pr-3 py-1.5"
                        style={{ flexShrink: 0, background: palette.field, border: `1px solid ${i === 0 ? palette.gold + "44" : palette.border}` }}
                      >
                        <span
                          className="flex items-center justify-center rounded-full flex-shrink-0"
                          style={{ width: "15px", height: "15px", fontSize: "8.5px", fontWeight: 800, fontFamily: mono, color: i < 3 ? palette.letterbox : palette.textFaint, background: i < 3 ? rankColor : "transparent", border: i < 3 ? "none" : `1px solid ${palette.border}` }}
                        >
                          {i + 1}
                        </span>
                        <Avatar name={p.author} size={20} src={avatarForAuthor(p.author)} />
                        <div className="flex flex-col leading-none">
                          <span style={{ color: palette.text, fontSize: "11px", fontWeight: 700, fontFamily: sans }}><PlanName name={p.author} /></span>
                          <span style={{ color: palette.textFaint, fontSize: "9.5px", fontFamily: mono, marginTop: "2px" }}>
                            {p.count} signal{p.count === 1 ? "" : "s"}{p.rrCount > 0 ? ` · 1:${fmt(p.rrSum / p.rrCount, 1)}` : ""}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}
      {!groupMessagesLoaded ? (
        <p className="text-xs" style={{ color: palette.textFaint, fontFamily: sans }}>Loading signals…</p>
      ) : signalMessages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-center py-8">
          <span className="flex items-center justify-center rounded-full mb-3" style={{ width: "52px", height: "52px", background: `${palette.gold}14`, border: `1px solid ${palette.gold}33` }}>
            <TrendingUp size={22} style={{ color: palette.gold }} />
          </span>
          <p style={{ color: palette.text, fontSize: "14px", fontWeight: 600, marginBottom: "3px", fontFamily: sans }}>No signals yet</p>
          <p className="text-xs" style={{ color: palette.textFaint, maxWidth: "260px", fontFamily: sans }}>
            {canPostSignal ? "Post the first trade signal below." : "Only the owner, admins, and signal providers can post signals here."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {signalMessages.map((m) => {
            const isMe = m.author === communityUsername;
            const canDelete = isMe || isGroupOwner;
            const isSell = m.direction === "sell";
            const dirColor = isSell ? palette.red : palette.green;
            const entryNum = num(m.entry), slNum = num(m.sl), tpNum = num(m.tp);
            const hasRR = entryNum && slNum && tpNum && entryNum !== slNum;
            const rr = hasRR ? Math.abs(tpNum - entryNum) / Math.abs(entryNum - slNum) : null;
            const authorEntry = groupMembersList.find((mem) => mem.username === m.author);
            const authorRole = authorEntry?.isOwner ? "Owner" : authorEntry?.isAdmin ? "Admin" : authorEntry?.isSignalProvider ? "Signal" : null;
            const isPinned = pinnedMessageId === m.id;
            return (
              <div
                key={m.id}
                className="rounded-2xl overflow-hidden"
                style={{
                  background: palette.surface,
                  border: `1px solid ${isPinned ? palette.gold + "55" : palette.border}`,
                  boxShadow: palette.shadow,
                }}
              >
                <div
                  className="flex items-center gap-2.5 px-3.5 py-2.5"
                  style={{ background: `${dirColor}0D`, borderBottom: `1px solid ${palette.border}` }}
                >
                  <span
                    className="flex items-center justify-center rounded-full flex-shrink-0"
                    style={{ width: "26px", height: "26px", background: `${dirColor}1F`, color: dirColor }}
                  >
                    {isSell ? <ChevronDown size={15} strokeWidth={3} /> : <ChevronRight size={15} strokeWidth={3} style={{ transform: "rotate(-90deg)" }} />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span style={{ fontFamily: display, fontSize: "15.5px", fontWeight: 800, color: palette.text, letterSpacing: "0.01em" }}>{m.pair}</span>
                      <span style={{ fontSize: "9.5px", fontFamily: sans, fontWeight: 800, color: dirColor, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                        {isSell ? "Sell" : "Buy"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5" style={{ marginTop: "1px" }}>
                      <button type="button" onClick={() => openCommunityMemberProfile(m.author)} className={TAP} style={{ background: "none", border: "none", padding: 0, lineHeight: 0 }} aria-label={`Open ${m.author}'s profile`}>
                        <Avatar name={m.author} size={14} src={avatarForAuthor(m.author)} online={isAuthorOnline(m.author)} />
                      </button>
                      <button type="button" onClick={() => openCommunityMemberProfile(m.author)} className={TAP} style={{ color: palette.textMuted, fontSize: "10.5px", fontWeight: 600, fontFamily: sans, background: "none", border: "none", padding: 0 }}><PlanName name={m.author} /></button>
                      {authorRole && (
                        <span style={{ color: palette.textFaint, fontSize: "9px", fontFamily: mono, border: `1px solid ${palette.border}`, borderRadius: "4px", padding: "0 4px" }}>
                          {authorRole}
                        </span>
                      )}
                      <span style={{ color: palette.textFaint, fontSize: "9.5px", fontFamily: mono }}>
                        · {new Date(m.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                  {rr !== null && (
                    <span
                      className="flex-shrink-0"
                      style={{ fontSize: "10px", fontFamily: mono, fontWeight: 800, color: palette.gold, background: `${palette.gold}17`, borderRadius: "7px", padding: "4px 8px" }}
                    >
                      1:{fmt(rr, 1)}
                    </span>
                  )}
                  {isGroupOwner && (
                    <button type="button" onClick={() => pinCommunityMessage(isPinned ? null : m.id)} className={`flex items-center justify-center rounded-full flex-shrink-0 ${TAP}`}
                      style={{ width: "22px", height: "22px", color: isPinned ? palette.gold : palette.textFaint }} aria-label="Pin signal">
                      <Bell size={12} />
                    </button>
                  )}
                  {canDelete && (
                    <button type="button" onClick={() => setPendingDeleteMsg(m.id)} className={`flex items-center justify-center rounded-full flex-shrink-0 ${TAP}`}
                      style={{ width: "22px", height: "22px", color: palette.textFaint }} aria-label="Delete signal">
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>

                <div className="px-3.5 pt-3 pb-3.5">
                  <div className="grid grid-cols-3 gap-2">
                    {[["Entry", m.entry, palette.text, Target], ["Stop Loss", m.sl, palette.red, ShieldAlert], ["Take Profit", m.tp, palette.green, Flame]].map(([lbl, val, color, Icon]) => (
                      <div key={lbl} className="rounded-xl text-center" style={{ padding: "8px 4px", background: palette.field, border: `1px solid ${palette.border}` }}>
                        <div className="flex items-center justify-center gap-1" style={{ marginBottom: "3px" }}>
                          <Icon size={9} style={{ color: palette.textFaint }} />
                          <span style={{ fontSize: "8.5px", color: palette.textFaint, textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: sans }}>{lbl}</span>
                        </div>
                        <div style={{ fontFamily: mono, fontSize: "12.5px", color, fontWeight: 700 }}>{val || "—"}</div>
                      </div>
                    ))}
                  </div>

                  {m.text && <div style={{ color: palette.textMuted, fontSize: "12.5px", marginTop: "10px", lineHeight: 1.45, fontFamily: sans }}>{m.text}</div>}

                  {Object.keys(m.reactions || {}).length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap" style={{ marginTop: "10px" }}>
                      {Object.entries(m.reactions).map(([emoji, count]) => {
                        const mine = (m.myReactions || []).includes(emoji);
                        return (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => toggleMessageReaction(m.id, emoji)}
                            className={TAP}
                            style={{
                              fontSize: "11px", fontFamily: mono, fontWeight: 700,
                              color: mine ? palette.gold : palette.textMuted,
                              background: mine ? `${palette.gold}14` : palette.field,
                              border: `1px solid ${mine ? `${palette.gold}44` : palette.border}`,
                              borderRadius: "999px", padding: "1px 7px",
                            }}
                          >
                            {emoji} {count}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex items-center gap-2" style={{ marginTop: "10px" }}>
                    <button
                      type="button"
                      onClick={() => shadowSignalToTrade(m)}
                      className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl ${TAP}`}
                      style={{
                        padding: "8px",
                        background: palette.field,
                        border: `1px solid ${palette.border}`,
                        color: palette.textMuted,
                        fontFamily: sans, fontSize: "11.5px", fontWeight: 600,
                      }}
                      aria-label="Log this trade in your journal"
                    >
                      <BookOpen size={12} />
                      Shadow
                    </button>
                    <button
                      type="button"
                      onClick={() => setReactionPickerFor(reactionPickerFor === m.id ? null : m.id)}
                      className={`flex items-center justify-center rounded-xl ${TAP}`}
                      style={{ padding: "8px 10px", background: palette.field, border: `1px solid ${palette.border}`, color: palette.textMuted }}
                      aria-label="Add reaction"
                    >
                      <span style={{ fontSize: "13px" }}>🙂</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openThreadId === m.id ? setOpenThreadId(null) : openSignalThread(m.id)}
                      className={`flex items-center justify-center gap-1.5 rounded-xl ${TAP}`}
                      style={{
                        padding: "8px 12px",
                        background: openThreadId === m.id ? `${palette.gold}17` : palette.field,
                        border: `1px solid ${openThreadId === m.id ? palette.gold + "55" : palette.border}`,
                        color: openThreadId === m.id ? palette.gold : palette.textMuted,
                        fontFamily: sans, fontSize: "11.5px", fontWeight: 600,
                      }}
                      aria-label="Discuss this signal"
                    >
                      💬 {m.replyCount > 0 ? m.replyCount : "Discuss"}
                    </button>
                  </div>

                  {reactionPickerFor === m.id && (
                    <div className="flex items-center gap-1.5 justify-center rounded-xl" style={{ marginTop: "8px", padding: "6px", background: palette.field, border: `1px solid ${palette.border}` }}>
                      {REACTION_EMOJIS.map((emoji) => (
                        <button key={emoji} type="button" onClick={() => toggleMessageReaction(m.id, emoji)} className={TAP} style={{ fontSize: "17px", background: "none", border: "none", padding: "3px" }}>
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}

                  {openThreadId === m.id && (
                    <div className="rounded-xl" style={{ marginTop: "8px", background: palette.field, border: `1px solid ${palette.border}`, padding: "10px" }}>
                      <div style={{ fontSize: "10px", color: palette.textFaint, fontFamily: mono, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>
                        Signal thread
                      </div>
                      {threadLoading[m.id] ? (
                        <p className="text-xs" style={{ color: palette.textFaint }}>Loading replies…</p>
                      ) : (threadReplies[m.id] || []).length === 0 ? (
                        <p className="text-xs" style={{ color: palette.textFaint }}>No replies yet — start the discussion.</p>
                      ) : (
                        <div className="flex flex-col gap-2 mb-2">
                          {(threadReplies[m.id] || []).map((rep) => (
                            <div key={rep.id} className="flex items-start gap-2">
                              <Avatar name={rep.author} size={20} src={avatarForAuthor(rep.author)} online={isAuthorOnline(rep.author)} />
                              <div className="flex-1 min-w-0 rounded-lg px-2.5 py-1.5" style={{ background: palette.surface, border: `1px solid ${palette.border}` }}>
                                <div className="flex items-center gap-1.5">
                                  <span style={{ color: palette.text, fontSize: "11px", fontWeight: 700 }}><PlanName name={rep.author} /></span>
                                  <span style={{ color: palette.textFaint, fontSize: "9px", fontFamily: mono }}>
                                    {new Date(rep.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                  </span>
                                </div>
                                <p className="text-xs" style={{ color: palette.textMuted, whiteSpace: "pre-wrap" }}>{rep.text}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={threadDraft}
                          onChange={(e) => setThreadDraft(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); sendThreadReply(m.id); } }}
                          placeholder="Reply in thread…"
                          className="flex-1 rounded-lg px-2.5 py-1.5 bg-transparent outline-none"
                          style={{ background: palette.surface, border: `1px solid ${palette.border}`, color: palette.text, fontSize: "12px" }}
                        />
                        <button
                          type="button"
                          onClick={() => sendThreadReply(m.id)}
                          disabled={!threadDraft.trim()}
                          className={TAP}
                          style={{ color: threadDraft.trim() ? palette.gold : palette.textFaint, background: "none", border: "none", padding: "4px" }}
                          aria-label="Send reply"
                        >
                          <Send size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={communityMessagesEndRef} />
        </div>
      )}
    </div>

    <div className="flex-shrink-0" style={{ borderTop: `1px solid ${palette.border}`, background: palette.surface, padding: isDesktop ? "12px 16px" : "10px 12px", paddingBottom: isDesktop ? "12px" : "calc(10px + env(safe-area-inset-bottom))" }}>
      {canPostSignal ? (
        <button type="button" onClick={() => setSignalComposerOpen(true)}
          className={`w-full flex items-center justify-center gap-2 rounded-xl py-3 ${TAP}`}
          style={{
            background: palette.gold,
            color: palette.letterbox, boxShadow: `0 3px 10px ${palette.gold}44`,
            fontFamily: sans, fontSize: "13.5px", fontWeight: 700,
          }} aria-label="Post a new signal">
          <Plus size={15} />
          Post Signal
        </button>
      ) : (
        <p className="text-xs text-center" style={{ color: palette.textFaint, fontFamily: sans }}>
          Only the owner, admins, and signal providers can post signals in this group.
        </p>
      )}
      {communityApiError && <p className="text-xs mt-2 text-center" style={{ color: palette.red, fontFamily: sans }}>{communityApiError}</p>}
    </div>

    {signalComposerOpen && (
      <div
        className="fixed inset-0 flex items-end justify-center"
        style={{ background: "rgba(5,7,12,0.75)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)", zIndex: 95 }}
        onClick={() => setSignalComposerOpen(false)}
      >
        <div
          className="w-full sheet-in"
          style={{
            maxWidth: "440px",
            background: palette.surface,
            border: `1px solid ${palette.border}`,
            borderTopLeftRadius: "22px",
            borderTopRightRadius: "22px",
            boxShadow: palette.shadow,
            padding: "16px",
            paddingBottom: "calc(16px + env(safe-area-inset-bottom))",
            maxHeight: "85vh",
            overflowY: "auto",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-center pb-2">
            <span style={{ width: "36px", height: "4px", borderRadius: "999px", background: palette.border }} />
          </div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <TrendingUp size={14} style={{ color: palette.gold }} />
              <span style={{ fontSize: "13px", fontWeight: 700, color: palette.text, fontFamily: sans }}>New Signal</span>
            </div>
            <button type="button" onClick={() => setSignalComposerOpen(false)} className={`flex items-center justify-center rounded-full ${TAP}`}
              style={{ width: "26px", height: "26px", background: palette.field, color: palette.textMuted }} aria-label="Close">
              <X size={13} />
            </button>
          </div>

          <div className="rounded-2xl p-3.5 mb-2.5" style={{ background: palette.field, border: `1px solid ${palette.border}` }}>
            <div className="grid grid-cols-2 gap-2 mb-2.5">
              <div>
                <div style={{ fontSize: "9.5px", color: palette.textFaint, marginBottom: "4px", fontFamily: sans, fontWeight: 600 }}>Pair</div>
                <input type="text" value={signalPair} onChange={(e) => setSignalPair(e.target.value.toUpperCase())} placeholder="XAUUSD"
                  className="w-full rounded-xl px-3 py-2 bg-transparent outline-none"
                  style={{ background: palette.surface, border: `1px solid ${palette.border}`, color: palette.text, fontFamily: mono, fontSize: "12.5px" }} />
              </div>
              <div>
                <div style={{ fontSize: "9.5px", color: palette.textFaint, marginBottom: "4px", fontFamily: sans, fontWeight: 600 }}>Direction</div>
                <div className="flex gap-1">
                  {["buy", "sell"].map((d) => (
                    <button key={d} type="button" onClick={() => setSignalDirection(d)} className={`flex-1 rounded-xl py-2 ${TAP}`}
                      style={{
                        background: signalDirection === d ? (d === "sell" ? palette.red : palette.green) : palette.surface,
                        color: signalDirection === d ? "#FFFFFF" : palette.textMuted,
                        border: `1px solid ${signalDirection === d ? "transparent" : palette.border}`,
                        fontFamily: sans, fontSize: "11.5px", textTransform: "uppercase", fontWeight: 700,
                      }}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[["Entry", signalEntry, setSignalEntry], ["Stop Loss", signalSL, setSignalSL], ["Take Profit", signalTP, setSignalTP]].map(([lbl, val, setter]) => (
                <div key={lbl}>
                  <div style={{ fontSize: "9.5px", color: palette.textFaint, marginBottom: "4px", fontFamily: sans, fontWeight: 600 }}>{lbl}</div>
                  <input type="text" value={val} onChange={(e) => setter(e.target.value)} placeholder="0.00"
                    className="w-full rounded-xl px-2.5 py-2 bg-transparent outline-none"
                    style={{ background: palette.surface, border: `1px solid ${palette.border}`, color: palette.text, fontFamily: mono, fontSize: "12px" }} />
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-2xl mb-3" style={{ background: palette.field, border: `1px solid ${palette.border}`, padding: "4px 4px 4px 16px" }}>
            <input type="text" value={communityMsgText} onChange={(e) => setCommunityMsgText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); sendCommunityMessage(); setSignalComposerOpen(false); } }}
              placeholder="Add a note (optional)"
              className="flex-1 bg-transparent py-2.5 outline-none"
              style={{ color: palette.text, fontSize: "13px", fontFamily: sans }} />
          </div>
          <button type="button" onClick={() => { sendCommunityMessage(); setSignalComposerOpen(false); }} disabled={!signalPair.trim()}
            className={`w-full flex items-center justify-center gap-2 rounded-xl py-3 ${TAP}`}
            style={{
              background: palette.gold,
              color: palette.letterbox, boxShadow: `0 3px 10px ${palette.gold}44`,
              opacity: !signalPair.trim() ? 0.5 : 1,
              fontFamily: sans, fontSize: "13.5px", fontWeight: 700,
            }} aria-label="Post signal">
            <Send size={15} />
            Post Signal
          </button>
          {communityApiError && <p className="text-xs mt-2 text-center" style={{ color: palette.red, fontFamily: sans }}>{communityApiError}</p>}
        </div>
      </div>
    )}
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

              {/* Stories — their own row + composer, completely separate from feed posts (Telegram-style) */}
              <input ref={storyImageInputRef} type="file" accept="image/*" onChange={handleStoryImageChange} style={{ display: "none" }} />
              <div className="flex items-start gap-3 mb-5 pb-1" style={{ overflowX: "auto", scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}>
                {(() => {
                  const hasOwnStory = (storiesByAuthor[communityUsername] || []).length > 0;
                  const ownUnseen = authorHasUnseen(communityUsername);
                  return (
                    <div className="relative flex-shrink-0" style={{ width: isDesktop ? "68px" : "60px" }}>
                      <button
                        type="button"
                        onClick={() => (hasOwnStory ? openStoryViewerFor(communityUsername) : openStoryComposer())}
                        className={`flex flex-col items-center w-full ${TAP}`}
                      >
                        <span
                          className="flex items-center justify-center rounded-full"
                          style={{
                            width: isDesktop ? "54px" : "46px", height: isDesktop ? "54px" : "46px",
                            border: hasOwnStory ? `2px solid ${ownUnseen ? palette.gold : palette.border}` : `1.5px dashed ${palette.textFaint}`,
                            padding: hasOwnStory ? "2px" : 0, color: palette.textFaint,
                          }}
                        >
                          {hasOwnStory ? (
                            <Avatar name={communityUsername} size={isDesktop ? 46 : 38} src={avatarForAuthor(communityUsername)} />
                          ) : (
                            <Plus size={isDesktop ? 20 : 17} />
                          )}
                        </span>
                        <span className="truncate" style={{ width: "100%", marginTop: "6px", color: palette.textMuted, fontSize: isDesktop ? "10.5px" : "9.5px", fontWeight: 600, textAlign: "center" }}>
                          My story
                        </span>
                      </button>
                      {hasOwnStory && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); openStoryComposer(); }}
                          className={`absolute flex items-center justify-center rounded-full ${TAP}`}
                          style={{ width: "18px", height: "18px", right: isDesktop ? "6px" : "4px", top: isDesktop ? "34px" : "28px", background: palette.gold, color: palette.letterbox, border: `2px solid ${palette.bg}` }}
                          aria-label="Add to your story"
                        >
                          <Plus size={11} />
                        </button>
                      )}
                    </div>
                  );
                })()}
                {storyAuthorOrder
                  .filter((u) => u !== communityUsername)
                  .map((u) => {
                    const unseen = authorHasUnseen(u);
                    return (
                      <button
                        key={u}
                        type="button"
                        onClick={() => openStoryViewerFor(u)}
                        className={`flex flex-col items-center flex-shrink-0 ${TAP}`}
                        style={{ width: isDesktop ? "68px" : "60px" }}
                      >
                        <span
                          className="flex items-center justify-center rounded-full"
                          style={{ width: isDesktop ? "54px" : "46px", height: isDesktop ? "54px" : "46px", border: `2px solid ${unseen ? palette.gold : palette.border}`, padding: "2px" }}
                        >
                          <Avatar name={u} size={isDesktop ? 46 : 38} src={avatarForAuthor(u)} />
                        </span>
                        <span className="truncate" style={{ width: "100%", marginTop: "6px", color: unseen ? palette.text : palette.textMuted, fontSize: isDesktop ? "10.5px" : "9.5px", fontWeight: 600, textAlign: "center" }}>
                          {u}
                        </span>
                      </button>
                    );
                  })}
              </div>

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
                      <button key={t.id} type="button" onClick={() => setLeaderboardMetric(t.id)} className={`px-3 py-1.5 rounded-full flex-shrink-0 ${TAP}`} style={{ background: leaderboardMetric === t.id ? palette.text : palette.field, color: leaderboardMetric === t.id ? palette.letterbox : palette.textMuted, border: `1px solid ${leaderboardMetric === t.id ? palette.text : palette.border}`, fontFamily: sans, fontSize: "11px", fontWeight: 700 }}>{t.label}</button>
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
        <div
          className="flex-1 px-4 py-4"
          style={{
            background: palette.bg,
            overflowY: "auto",
            minHeight: 0,
          }}
        >
          {!groupMessagesLoaded ? (
            <p className="text-xs" style={{ color: palette.textFaint }}>Loading messages…</p>
          ) : chatMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-8">
              <span
                className="flex items-center justify-center rounded-full mb-3"
                style={{ width: "52px", height: "52px", background: `${palette.gold}14`, border: `1px solid ${palette.gold}33` }}
              >
                <Users size={22} style={{ color: palette.gold }} />
              </span>
              <p style={{ color: palette.text, fontSize: "14px", fontWeight: 600, marginBottom: "3px" }}>No messages yet</p>
              <p className="text-xs" style={{ color: palette.textFaint, maxWidth: "260px" }}>
                Say hello to get the conversation going.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {chatMessages.map((m, i) => {
                const isMe = m.author === communityUsername;
                const prev = chatMessages[i - 1];
                const grouped = prev && prev.author === m.author && m.ts - prev.ts < 3 * 60 * 1000;
                const bubbleColor = isMe ? palette.gold : palette.surface;
                const textColor = isMe ? palette.letterbox : palette.text;
                const canDelete = isMe || isGroupOwner;
                return (
                  <div
                    key={m.id}
                    className="flex group/msg"
                    style={{ justifyContent: isMe ? "flex-end" : "flex-start", gap: "8px", marginTop: grouped ? "-6px" : 0 }}
                    onMouseEnter={(e) => { const el = e.currentTarget.querySelector(".msg-del-btn"); if (el) el.style.opacity = "1"; }}
                    onMouseLeave={(e) => { const el = e.currentTarget.querySelector(".msg-del-btn"); if (el) el.style.opacity = "0"; }}
                  >
                    {isMe && canDelete && (
                      <button
                        type="button"
                        onClick={() => setPendingDeleteMsg(m.id)}
                        className={`msg-del-btn self-center flex items-center justify-center rounded-full ${TAP}`}
                        style={{
                          width: "24px", height: "24px", flexShrink: 0,
                          background: palette.field, border: `1px solid ${palette.border}`,
                          color: palette.textFaint, opacity: 0, transition: "opacity 0.15s ease",
                        }}
                        aria-label="Delete message"
                      >
                        <Trash2 size={11} />
                      </button>
                    )}
                    {!isMe && (
                      <span style={{ width: "28px", flexShrink: 0 }}>
                        {!grouped && (
                          <button type="button" onClick={() => openCommunityMemberProfile(m.author)} className={TAP} style={{ background: "none", border: "none", padding: 0, lineHeight: 0 }} aria-label={`Open ${m.author}'s profile`}>
                            <Avatar name={m.author} size={28} src={avatarForAuthor(m.author)} online={isAuthorOnline(m.author)} />
                          </button>
                        )}
                      </span>
                    )}
                    <div style={{ maxWidth: isDesktop ? "62%" : "78%" }}>
                      {!isMe && !grouped && (
                        <button type="button" onClick={() => openCommunityMemberProfile(m.author)} className={TAP} style={{ color: palette.gold, fontSize: "11.5px", fontWeight: 700, marginBottom: "3px", marginLeft: "3px", background: "none", border: "none", padding: 0 }}><PlanName name={m.author} /></button>
                      )}
                      {m.type === "sticker" ? (
                        <div style={{ display: "inline-block" }}>
                          {m.replyToAuthor && (
                            <div
                              className="px-3 py-1.5 rounded-lg mb-1"
                              style={{ background: palette.field, borderLeft: `3px solid ${palette.gold}`, display: "inline-block", maxWidth: "160px" }}
                            >
                              <div style={{ fontSize: "10px", fontWeight: 700, color: palette.gold }}>{m.replyToAuthor}</div>
                              <div className="truncate" style={{ fontSize: "11px", color: palette.textMuted }}>{m.replyToText}</div>
                            </div>
                          )}
                          <img src={m.text} alt="Sticker" style={{ width: "120px", height: "120px", objectFit: "contain", display: "block" }} />
                        </div>
                      ) : (
                        <div
                          className="rounded-2xl px-4 py-2.5"
                          style={{
                            background: bubbleColor,
                            color: textColor,
                            fontSize: "14px",
                            lineHeight: 1.45,
                            boxShadow: isMe ? `0 3px 10px ${palette.gold}33` : palette.shadow,
                            borderTopRightRadius: isMe && grouped ? "6px" : "16px",
                            borderTopLeftRadius: !isMe && grouped ? "6px" : "16px",
                          }}
                        >
                          {m.replyToAuthor && (
                            <div
                              className="px-4 py-2"
                              style={{
                                margin: "-10px -16px 6px -16px",
                                background: isMe ? "rgba(0,0,0,0.14)" : palette.field,
                                borderLeft: `3px solid ${isMe ? palette.letterbox : palette.gold}`,
                                borderTopLeftRadius: !isMe && grouped ? "6px" : "14px",
                                borderTopRightRadius: isMe && grouped ? "6px" : "14px",
                                borderBottomLeftRadius: "4px",
                                borderBottomRightRadius: "4px",
                              }}
                            >
                              <div style={{ fontSize: "10px", fontWeight: 700, color: isMe ? palette.letterbox : palette.gold, opacity: 0.9 }}>
                                {m.replyToAuthor}
                              </div>
                              <div className="truncate" style={{ fontSize: "11px", opacity: 0.85, color: isMe ? palette.letterbox : palette.textMuted }}>{m.replyToText}</div>
                            </div>
                          )}
                          {m.text}
                        </div>
                      )}
                      {Object.keys(m.reactions || {}).length > 0 && (
                        <div
                          className="flex items-center gap-1 flex-wrap"
                          style={{ marginTop: "4px", justifyContent: isMe ? "flex-end" : "flex-start" }}
                        >
                          {Object.entries(m.reactions).map(([emoji, count]) => {
                            const mine = (m.myReactions || []).includes(emoji);
                            return (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() => toggleMessageReaction(m.id, emoji)}
                                className={TAP}
                                style={{
                                  fontSize: "11px", fontFamily: mono, fontWeight: 700,
                                  color: mine ? palette.gold : palette.textMuted,
                                  background: mine ? `${palette.gold}14` : palette.field,
                                  border: `1px solid ${mine ? `${palette.gold}44` : palette.border}`,
                                  borderRadius: "999px", padding: "1px 7px",
                                }}
                                aria-label={`${emoji} reaction, ${count}`}
                              >
                                {emoji} {count}
                              </button>
                            );
                          })}
                        </div>
                      )}
                      <div
                        className="flex items-center gap-2 relative"
                        style={{ marginTop: "3px", justifyContent: isMe ? "flex-end" : "flex-start" }}
                      >
                        <span style={{ color: palette.textFaint, fontSize: "9.5px", fontFamily: mono }}>
                          {new Date(m.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        <button
                          type="button"
                          onClick={() => setReplyingTo({ id: m.id, author: m.author, preview: m.type === "sticker" ? "🖼️ Sticker" : (m.text || "").slice(0, 60) })}
                          className={TAP}
                          style={{ color: palette.textFaint, fontSize: "9.5px", fontFamily: mono }}
                        >
                          Reply
                        </button>
                        <button
                          type="button"
                          onClick={() => setReactionPickerFor(reactionPickerFor === m.id ? null : m.id)}
                          className={TAP}
                          style={{ color: reactionPickerFor === m.id ? palette.gold : palette.textFaint, fontSize: "9.5px", fontFamily: mono }}
                          aria-label="Add reaction"
                        >
                          React
                        </button>
                        {reactionPickerFor === m.id && (
                          <div
                            className="flex items-center gap-1 rounded-full"
                            style={{
                              position: "absolute", bottom: "20px", [isMe ? "right" : "left"]: 0,
                              background: palette.surface, border: `1px solid ${palette.border}`,
                              boxShadow: palette.shadow, padding: "4px 6px", zIndex: 6,
                            }}
                          >
                            {REACTION_EMOJIS.map((emoji) => (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() => toggleMessageReaction(m.id, emoji)}
                                className={TAP}
                                style={{ fontSize: "16px", background: "none", border: "none", padding: "2px" }}
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      {isGroupOwner && (
                        <button
                          type="button"
                          onClick={() => pinCommunityMessage(pinnedMessageId === m.id ? null : m.id)}
                          className={TAP}
                          style={{
                            color: pinnedMessageId === m.id ? palette.gold : palette.textFaint,
                            fontSize: "9.5px", fontFamily: mono, marginTop: "3px",
                            display: "flex", alignItems: "center", gap: "3px",
                            justifyContent: isMe ? "flex-end" : "flex-start", width: "100%",
                          }}
                        >
                          <Bell size={9} />
                          {pinnedMessageId === m.id ? "Unpin" : "Pin"}
                        </button>
                      )}
                    </div>
                    {!isMe && canDelete && (
                      <button
                        type="button"
                        onClick={() => setPendingDeleteMsg(m.id)}
                        className={`msg-del-btn self-center flex items-center justify-center rounded-full ${TAP}`}
                        style={{
                          width: "24px", height: "24px", flexShrink: 0,
                          background: palette.field, border: `1px solid ${palette.border}`,
                          color: palette.textFaint, opacity: 0, transition: "opacity 0.15s ease",
                        }}
                        aria-label="Delete message"
                      >
                        <Trash2 size={11} />
                      </button>
                    )}
                    {isMe && (
                      <span style={{ width: "28px", flexShrink: 0 }}>
                        {!grouped && <Avatar name={m.author} size={28} src={communityAvatar} />}
                      </span>
                    )}
                  </div>
                );
              })}
              <div ref={communityMessagesEndRef} />
            </div>
          )}
        </div>

        {/* Composer */}
        <div
          className="flex-shrink-0 relative"
          style={{
            borderTop: `1px solid ${palette.border}`,
            background: palette.surface,
            padding: isDesktop ? "12px 16px 16px" : "8px 12px 12px",
          }}
        >
          {typingUsers.length > 0 && (
            <div className="flex items-center gap-1.5 px-1" style={{ marginBottom: "6px" }}>
              <span className="flex gap-0.5" aria-hidden="true">
                <style>{`@keyframes typingDot{0%,60%,100%{opacity:.25}30%{opacity:1}}`}</style>
                {[0, 1, 2].map((i) => (
                  <span key={i} style={{ width: "4px", height: "4px", borderRadius: "999px", background: palette.gold, display: "inline-block", animation: `typingDot 1.1s ${i * 0.15}s infinite` }} />
                ))}
              </span>
              <span style={{ color: palette.textFaint, fontSize: "11px", fontFamily: sans, fontStyle: "italic" }}>
                {typingUsers.length === 1
                  ? `${typingUsers[0]} is typing…`
                  : typingUsers.length === 2
                  ? `${typingUsers[0]} and ${typingUsers[1]} are typing…`
                  : `${typingUsers.length} people are typing…`}
              </span>
            </div>
          )}
          {replyingTo && (
            <div
              className="flex items-center justify-between rounded-lg px-3 py-2 mb-2"
              style={{ background: palette.field, border: `1px solid ${palette.gold}55` }}
            >
              <div className="min-w-0">
                <div style={{ color: palette.gold, fontSize: "10.5px", fontWeight: 700 }}>Replying to {replyingTo.author}</div>
                <div className="truncate" style={{ color: palette.textMuted, fontSize: "11px" }}>{replyingTo.preview}</div>
              </div>
              <button type="button" onClick={() => setReplyingTo(null)} className={TAP} style={{ color: palette.textFaint, flexShrink: 0 }}>
                <X size={13} />
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
          <div
            className="flex items-center gap-2 rounded-2xl"
            style={{ background: palette.field, border: `1px solid ${palette.border}`, padding: "4px" }}
          >
            <button
              type="button"
              onClick={() => {
                if (!stickerPacksLoaded) fetchStickerPacks();
                setStickerPickerOpen((v) => !v);
              }}
              className={`flex items-center justify-center rounded-full flex-shrink-0 ${TAP}`}
              style={{ width: "32px", height: "32px", marginLeft: "4px", color: stickerPickerOpen ? palette.gold : palette.textFaint }}
              aria-label="Stickers"
            >
              <Sticker size={18} />
            </button>
            <input
              type="text"
              value={communityMsgText}
              onChange={(e) => { setCommunityMsgText(e.target.value); pingTyping(); }}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); sendCommunityMessage(); } }}
              placeholder="Message"
              className={isDesktop ? "flex-1 bg-transparent py-3 outline-none" : "flex-1 bg-transparent py-3.5 outline-none"}
              style={{ color: palette.text, fontSize: isDesktop ? "14px" : "15px" }}
            />
            <button
              type="button"
              onClick={sendCommunityMessage}
              disabled={!communityMsgText.trim()}
              className={`flex items-center justify-center rounded-full flex-shrink-0 ${TAP}`}
              style={{
                width: isDesktop ? "40px" : "42px",
                height: isDesktop ? "40px" : "42px",
                background: palette.gold,
                color: palette.letterbox,
                boxShadow: `0 3px 10px ${palette.gold}44`,
                opacity: !communityMsgText.trim() ? 0.5 : 1,
              }}
              aria-label="Send"
            >
              <Send size={16} />
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
                  <Avatar name={g.name} size={32} src={g.avatar} />
                  <div className="flex-1 min-w-0">
                    <div className="truncate" style={{ color: palette.text, fontSize: "12.5px", fontWeight: 700 }}>{g.name}</div>
                    <div style={{ color: palette.textFaint, fontSize: "9.5px", marginTop: "1px" }}>{g.role === "owner" ? "Owner" : "Member"}</div>
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
            Private groups, live chat, and shared trade signals — pick a username to get started.
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
} else if (isDesktop) {
    // ---------- DESKTOP COMMUNITY ----------
    body = (
      <div className="flex gap-4 flex-1" style={{ minHeight: 0, height: "100%" }}>
        {renderSidebar()}
        <div className="flex-1 min-w-0 rounded-2xl overflow-hidden" style={{ border: `1px solid ${palette.border}`, boxShadow: palette.shadow }}>
          {communityLobbyTab === "search" ? renderCommunitySearch() : activeGroupId ? renderChatPanel({ background: palette.bg, height: "100%" }) : communityLobbyTab === "global" ? renderGlobalFeed() : (
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
    body = <div className="flex flex-col flex-1 min-h-0 rounded-2xl overflow-hidden" style={{ border: `1px solid ${palette.border}`, boxShadow: palette.shadow }}>{renderGlobalFeed()}</div>;
  } else if (!activeGroupId) {
    // ---------- MOBILE GROUP LOBBY ----------
    const joined = myGroups;
    body = (
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex-1 overflow-y-auto">
          <form className="mb-3" onSubmit={(e) => { e.preventDefault(); searchCommunity(communitySearch); }}>
            <div className="flex items-center gap-2 rounded-xl px-3" style={{ height: "40px", background: palette.field, border: `1px solid ${palette.border}` }}>
              <Search size={15} style={{ color: palette.textFaint }} />
              <input value={communitySearch} onChange={(e) => setCommunitySearch(e.target.value)} placeholder="Search people & posts" className="flex-1 min-w-0 bg-transparent outline-none" style={{ color: palette.text, fontSize: "12px" }} />
            </div>
          </form>
          <button type="button" onClick={() => { setCommunityLobbyTab("global"); setCommunityMobileFeedOpen(true); if (!globalFeedLoaded) loadGlobalFeed(); }} className={`w-full flex items-center gap-3 rounded-2xl p-4 mb-4 ${TAP}`} style={{ background: palette.surface, border: `1px solid ${palette.gold}44`, color: palette.text }}>
            <span className="flex items-center justify-center rounded-xl" style={{ width: "42px", height: "42px", background: `${palette.gold}14`, color: palette.gold }}><Newspaper size={19} /></span><div className="flex-1 text-left"><div style={{ fontSize: "14px", fontWeight: 800 }}>Global Feed</div><div style={{ color: palette.textFaint, fontSize: "10.5px", marginTop: "2px" }}>See posts from everyone on Tredzi</div></div><ChevronRight size={16} style={{ color: palette.gold }} />
          </button>
          <div className="flex items-center justify-between mb-3"><span style={{ color: palette.textFaint, fontSize: "10px", fontFamily: mono, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em" }}>My Groups</span></div>
          {renderGroupActions()}
          {joined.length === 0 ? (
            <div className="rounded-2xl p-5 text-center" style={{ background: palette.surface, border: `1px solid ${palette.border}` }}><Users size={22} style={{ color: palette.gold, margin: "0 auto 8px" }} /><div style={{ color: palette.text, fontSize: "13px", fontWeight: 700 }}>No groups yet</div><div style={{ color: palette.textFaint, fontSize: "11px", marginTop: "4px" }}>Create a group or join one with an invite code.</div></div>
          ) : joined.map((g) => (
            <button key={g.id} type="button" onClick={() => { setCommunityLobbyTab("mine"); setCommunityMobileFeedOpen(false); setActiveGroupId(g.id); }} className={`w-full flex items-center gap-3 rounded-2xl p-3.5 mb-2 text-left ${TAP}`} style={{ background: palette.surface, border: `1px solid ${palette.border}` }}>
              <Avatar name={g.name} size={40} src={g.avatar} /><div className="flex-1 min-w-0"><div className="truncate" style={{ color: palette.text, fontSize: "13.5px", fontWeight: 700 }}>{g.name}</div><div style={{ color: palette.textFaint, fontSize: "10px", marginTop: "2px" }}>{g.role === "owner" ? "Owner" : "Member"}</div></div><ChevronRight size={16} style={{ color: palette.textFaint }} />
            </button>
          ))}
        </div>
      </div>
    );
  } else {
    // ---------- MOBILE GROUP ----------
    body = renderChatPanel({ height: "100%" });
  }
  body = (
    <>
      {body}
        {profileOpen && (() => {
          const viewingName = profileView || communityUsername;
          const isMe = !profileView || profileView === communityUsername;
          const p = profileData && String(profileData.username).toLowerCase() === String(viewingName || "").toLowerCase() ? profileData : null;
          const chip = { color: palette.gold, background: `${palette.gold}14`, border: `1px solid ${palette.gold}33`, borderRadius: "999px", padding: "2px 8px", fontSize: "10.5px", fontWeight: 700 };
          const pill = (primary, busy) => ({
            height: isDesktop ? "32px" : "34px", padding: "0 18px", borderRadius: "8px", whiteSpace: "nowrap",
            fontSize: "12.5px", fontWeight: 700, fontFamily: sans,
            background: primary ? palette.gold : palette.field,
            border: `1px solid ${primary ? "transparent" : palette.border}`,
            color: primary ? palette.letterbox : palette.text,
            opacity: busy ? 0.6 : 1,
          });
          // Universal profile: same account, same card, no matter which group opened it —
          // so on desktop it reads like Instagram's web profile (centered card, big round
          // avatar beside the stats/bio, no phone-frame chrome), not a mobile screen stretched wide.
          const shell = (children) => (
            isDesktop ? (
              <div className="fixed inset-0 flex flex-col" style={{ background: palette.bg, zIndex: 108 }}>
                {/* Mounted here too (not just on the Feed tab) so tapping a profile picture or the
                    story circle can always open the file picker, even if Feed isn't the active tab
                    underneath this overlay. */}
                <input ref={storyImageInputRef} type="file" accept="image/*" onChange={handleStoryImageChange} style={{ display: "none" }} />
                <div className="flex items-center gap-3 px-6 flex-shrink-0" style={{ height: "56px", borderBottom: `1px solid ${palette.border}`, background: palette.surface }}>
                  <button type="button" onClick={closeProfileBack} className={`flex items-center gap-1.5 ${TAP}`} style={{ background: "none", border: "none", color: palette.textMuted, fontSize: "13px", fontWeight: 600, fontFamily: sans }} aria-label="Back">
                    <ChevronLeft size={18} /> Back
                  </button>
                  <span aria-hidden="true" style={{ width: "1px", height: "18px", background: palette.border }} />
                  <span className="truncate" style={{ color: palette.text, fontSize: "14px", fontWeight: 700 }}>{p ? p.username : (viewingName || "Profile")}</span>
                </div>
                <div className="flex-1" style={{ overflowY: "auto", minHeight: 0 }}>
                  <div className="mx-auto w-full" style={{ maxWidth: "935px", padding: "0 20px" }}>
                    {children}
                  </div>
                </div>
              </div>
            ) : (
              <div className="fixed inset-0 flex justify-center" style={{ background: palette.bg, zIndex: 108 }}>
                <div className="flex flex-col w-full min-h-0">
                  <input ref={storyImageInputRef} type="file" accept="image/*" onChange={handleStoryImageChange} style={{ display: "none" }} />
                  <div className="flex items-center gap-3 px-3 py-2.5 flex-shrink-0" style={{ borderBottom: `1px solid ${palette.border}`, background: palette.surface, paddingTop: "max(10px, env(safe-area-inset-top))" }}>
                    <button type="button" onClick={closeProfileBack} className={`flex items-center justify-center rounded-full flex-shrink-0 ${TAP}`} style={{ width: "32px", height: "32px", background: palette.field, border: `1px solid ${palette.border}`, color: palette.textMuted }} aria-label="Back">
                      <ChevronLeft size={17} />
                    </button>
                    <div className="min-w-0">
                      <div className="truncate" style={{ color: palette.text, fontSize: "16px", fontWeight: 800, lineHeight: 1.2 }}>{p ? p.username : (viewingName || "Profile")}</div>
                    </div>
                  </div>
                  {children}
                </div>
              </div>
            )
          );
          if (!p) {
            return shell(
              <p className="text-xs px-4 py-6" style={{ color: profileError ? palette.red : palette.textFaint }}>
                {profileError || (profileLoading ? "Loading profile…" : "Couldn't load this profile.")}
              </p>
            );
          }
          const stats = getCommunityMemberStats(p);
          const joinedText = p.joinedAt ? new Date(p.joinedAt).toLocaleDateString([], { month: "short", year: "numeric" }) : null;
          const mutuals = p.mutuals || [];
          const avatarSrc = isMe ? (communityAvatar || p.avatar || undefined) : (p.avatar || avatarForAuthor(p.username));
          const coverBg = avatarStyleFor(p.username).bg;
          const curve = stats.equityCurve || [];
          const cMin = curve.length ? Math.min(...curve) : 0;
          const cMax = curve.length ? Math.max(...curve) : 0;
          const cRange = cMax - cMin || 1;
          const curvePoints = curve.map((v, i) => `${(i / Math.max(1, curve.length - 1)) * 100},${100 - ((v - cMin) / cRange) * 70 - 15}`).join(" ");
          const fmtPct = (v) => (v == null || !Number.isFinite(v) ? "—" : `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`);
          // Profile shows only these three numbers, and only on the Stats tab.
          const statTiles = [
            ["P&L", fmtPct(stats.pnlPct), stats.pnlPct != null && stats.pnlPct < 0 ? palette.red : palette.green],
            ["Trades", stats.trades == null ? "—" : String(stats.trades), palette.text],
            ["Avg R", stats.avgR == null ? "—" : stats.avgR.toFixed(1), palette.text],
          ];
          // Tapping the profile picture opens that person's story (Instagram-style). If it's your
          // own picture and you have no active story, it starts one instead. If someone else has
          // no story, the picture is just a picture — nothing to open.
          const profileHasStory = (storiesByAuthor[p.username] || []).length > 0;
          const profileStoryUnseen = authorHasUnseen(p.username);
          const profileStoryAction = profileHasStory ? () => openStoryViewerFor(p.username) : (isMe ? openStoryComposer : null);
          const profileRingGradient = profileHasStory
            ? (profileStoryUnseen ? palette.gold : palette.border)
            : palette.gold;
          const avatarRingHandlers = profileStoryAction
            ? {
                role: "button",
                tabIndex: 0,
                onClick: profileStoryAction,
                onKeyDown: (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); profileStoryAction(); } },
                "aria-label": profileHasStory ? `View ${p.username}'s story` : "Add to your story",
              }
            : {};
          const avatarBlock = (
            <div className="relative flex-shrink-0">
              {isDesktop ? (
                <span className={`inline-flex rounded-full ${profileStoryAction ? TAP : ""}`} style={{ padding: "3px", background: profileRingGradient, cursor: profileStoryAction ? "pointer" : "default" }} {...avatarRingHandlers}>
                  <span className="inline-flex rounded-full" style={{ padding: "4px", background: palette.bg }}>
                    <Avatar name={p.username} size={150} src={avatarSrc} online={p.isOnline} />
                  </span>
                </span>
              ) : (
                <span className={`inline-flex rounded-full ${profileStoryAction ? TAP : ""}`} style={{ padding: "2px", background: profileRingGradient, cursor: profileStoryAction ? "pointer" : "default" }} {...avatarRingHandlers}>
                  <span className="inline-flex rounded-full" style={{ padding: "3px", background: palette.bg }}>
                    <Avatar name={p.username} size={80} src={avatarSrc} online={p.isOnline} />
                  </span>
                </span>
              )}
              {isMe && (
                <>
                  <input ref={profileAvatarInputRef} type="file" accept="image/*" onChange={handleCommunityAvatarChange} style={{ display: "none" }} />
                  <button
                    type="button"
                    onClick={() => profileAvatarInputRef.current && profileAvatarInputRef.current.click()}
                    disabled={communityAvatarUploading}
                    className={`absolute flex items-center justify-center rounded-full ${TAP}`}
                    style={{ right: isDesktop ? "8px" : "0px", bottom: isDesktop ? "8px" : "0px", width: isDesktop ? "30px" : "26px", height: isDesktop ? "30px" : "26px", background: palette.gold, color: palette.letterbox, border: `2px solid ${palette.bg}`, opacity: communityAvatarUploading ? 0.6 : 1 }}
                    aria-label="Change profile photo"
                  >
                    <Camera size={12} />
                  </button>
                </>
              )}
            </div>
          );
          const bioBlock = (
            <>
              {isMe && bioEditing ? (
                <div className="mt-2">
                  <textarea
                    value={bioDraft}
                    onChange={(e) => setBioDraft(e.target.value.slice(0, 160))}
                    rows={3}
                    autoFocus
                    placeholder="Tell people what you trade and how you think about risk…"
                    className="w-full rounded-xl px-3 py-2 outline-none"
                    style={{ background: palette.field, border: `1px solid ${palette.border}`, color: palette.text, fontSize: "13px", fontFamily: sans, resize: "none", lineHeight: 1.45, maxWidth: isDesktop ? "360px" : "none" }}
                  />
                  <div className="flex items-center justify-between mt-1.5" style={{ maxWidth: isDesktop ? "360px" : "none" }}>
                    <span style={{ color: palette.textFaint, fontSize: "11px", fontFamily: mono }}>{bioDraft.length}/160</span>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => setBioEditing(false)} className={TAP} style={{ ...pill(false, false), height: "30px", padding: "0 14px" }}>Cancel</button>
                      <button type="button" onClick={saveProfileBio} disabled={bioSaving} className={TAP} style={{ ...pill(true, bioSaving), height: "30px", padding: "0 16px" }}>
                        {bioSaving ? "Saving…" : "Save"}
                      </button>
                    </div>
                  </div>
                </div>
              ) : p.bio ? (
                <p className="mt-1.5" style={{ color: palette.text, fontSize: "13.5px", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{p.bio}</p>
              ) : isMe ? (
                <p className="mt-1.5" style={{ color: palette.textFaint, fontSize: "12.5px" }}>Add a short bio so people know who you are.</p>
              ) : null}
              {joinedText && <p className="mt-1.5" style={{ color: palette.textFaint, fontSize: "12px" }}>Joined {joinedText}</p>}
              {!isMe && mutuals.length > 0 && (
                <p className="mt-2" style={{ color: palette.textMuted, fontSize: "12px" }}>
                  Followed by{" "}
                  {mutuals.slice(0, 2).map((name, i) => (
                    <span key={name}>
                      {i > 0 && ", "}
                      <button type="button" onClick={() => openCommunityMemberProfile(name)} className={TAP} style={{ background: "none", border: "none", padding: 0, color: palette.text, fontWeight: 700, fontSize: "12px" }}>{name}</button>
                    </span>
                  ))}
                  {mutuals.length > 2 && ` and ${mutuals.length - 2} other${mutuals.length - 2 === 1 ? "" : "s"} you follow`}
                </p>
              )}
              {profileError && <p className="text-xs mt-2" style={{ color: palette.red }}>{profileError}</p>}
            </>
          );
          const actionButton = isMe ? (
            !bioEditing && (
              <button type="button" onClick={() => { setBioDraft(p.bio || ""); setBioEditing(true); }} className={`flex items-center justify-center gap-1.5 ${TAP}`} style={{ ...pill(false, false), flex: isDesktop ? "none" : 1 }}>
                <Pencil size={12} /> Edit bio
              </button>
            )
          ) : (
            <button type="button" onClick={() => toggleFollowMember(p.username, !!p.isFollowedByMe)} disabled={followBusy} className={TAP} style={{ ...pill(!p.isFollowedByMe, followBusy), minWidth: "96px", flex: isDesktop ? "none" : 1 }}>
              {p.isFollowedByMe ? "Following" : p.followsMe ? "Follow back" : "Follow"}
            </button>
          );
          const statsRow = (
            <div className="flex items-center gap-4 mt-2.5">
              {[[p.followingCount, "Following", "following"], [p.followerCount, "Followers", "followers"]].map(([value, label, kind]) => (
                <button key={kind} type="button" onClick={() => openFollowList(p.username, kind)} className={TAP} style={{ background: "none", border: "none", padding: 0, fontSize: "13px", color: palette.textMuted }}>
                  <span style={{ color: palette.text, fontWeight: 800 }}>{value || 0}</span> {label}
                </button>
              ))}
            </div>
          );
          const nameRow = (
            <div className="flex items-center gap-2 flex-wrap">
              <span style={{ color: palette.text, fontSize: isDesktop ? "20px" : "18px", fontWeight: 800 }}><PlanName name={p.username} /></span>
              {p.verifiedPnl && <span style={chip}>Verified P&L</span>}
              {!isMe && p.followsMe && <span style={{ color: palette.textMuted, background: palette.field, border: `1px solid ${palette.border}`, borderRadius: "999px", padding: "2px 8px", fontSize: "10.5px", fontWeight: 600 }}>Follows you</span>}
            </div>
          );
          const postsGridGap = "2px";
          const postsGrid = !profilePostsLoaded ? (
            <p className="text-xs px-4 py-5" style={{ color: palette.textFaint }}>Loading posts…</p>
          ) : profilePosts.length === 0 ? (
            <div className="flex flex-col items-center text-center px-6 py-10">
              <span className="flex items-center justify-center rounded-full mb-3" style={{ width: "48px", height: "48px", background: `${palette.gold}14`, border: `1px solid ${palette.gold}33` }}>
                <LayoutGrid size={20} style={{ color: palette.gold }} />
              </span>
              <p className="text-xs" style={{ color: palette.textFaint, maxWidth: "240px" }}>
                {isMe ? "Share your first post and it'll show up here." : `${p.username} hasn't posted yet.`}
              </p>
              {isMe && (
                <button type="button" onClick={() => setProfileComposerOpen(true)} className={`flex items-center gap-1.5 mt-3 ${TAP}`} style={pill(true, false)}>
                  <Plus size={13} /> Share a post
                </button>
              )}
            </div>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: postsGridGap, paddingTop: "0" }}>
                {profilePosts.map((post) => {
                  return (
                    <button key={post.id} type="button" onClick={() => setProfilePostOpen(post)} className={`group ${TAP}`} aria-label="Open post" style={{ position: "relative", aspectRatio: "3 / 4", overflow: "hidden", padding: 0, border: "none", borderRadius: "0", background: palette.field, textAlign: "left", display: "block" }}>
                      {post.image ? (
                        <img src={post.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                      ) : (
                        <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", padding: isDesktop ? "18px" : "10px", background: avatarStyleFor(post.author).bg, boxShadow: "inset 0 0 0 999px rgba(5,7,12,0.45)", color: "#FFFFFF", fontSize: isDesktop ? "14px" : "11.5px", fontWeight: 600, lineHeight: 1.4 }}>
                          <span style={{ display: "-webkit-box", WebkitLineClamp: isDesktop ? 6 : 5, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{post.text}</span>
                        </span>
                      )}
                      {isDesktop && (
                        <span className="absolute inset-0 flex items-center justify-center gap-6 opacity-0 group-hover:opacity-100" style={{ background: "rgba(5,7,12,0.5)", transition: "opacity 0.15s", color: "#fff", fontSize: "16px", fontWeight: 700, fontFamily: sans }}>
                          <span className="flex items-center gap-1.5"><Heart size={19} fill="#FFFFFF" color="#FFFFFF" /> {post.likeCount || 0}</span>
                          <span className="flex items-center gap-1.5"><MessageCircle size={19} fill="#FFFFFF" color="#FFFFFF" /> {post.commentCount || 0}</span>
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              {profilePostsNext && (
                <div className="flex justify-center py-4">
                  <button type="button" onClick={loadMoreProfilePosts} className={TAP} style={pill(false, false)}>Load more</button>
                </div>
              )}
            </>
          );
          const statsPanel = (
            <div className="px-4 pt-4" style={{ paddingLeft: isDesktop ? 0 : undefined, paddingRight: isDesktop ? 0 : undefined, paddingTop: isDesktop ? "32px" : undefined }}>
              <div className="grid gap-2.5 mb-3.5" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
                {statTiles.map(([label, value, color]) => (
                  <div key={label} className="rounded-xl p-3 text-center" style={{ background: palette.field, border: `1px solid ${palette.border}` }}>
                    <div style={{ color: palette.textFaint, fontSize: "10.5px", marginBottom: "5px" }}>{label}</div>
                    <div style={{ color, fontSize: isDesktop ? "24px" : "16px", fontWeight: 800 }}>{value}</div>
                  </div>
                ))}
              </div>
              <div className="rounded-2xl p-3.5" style={{ background: palette.field, border: `1px solid ${palette.border}` }}>
                <div style={{ color: palette.textMuted, fontSize: "11px", marginBottom: "7px" }}>Equity curve (across every group)</div>
                {curvePoints ? (
                  <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: "100%", height: isDesktop ? "220px" : "110px", display: "block" }}>
                    <polyline points={curvePoints} fill="none" stroke={palette.green} strokeWidth="2.4" vectorEffect="non-scaling-stroke" />
                  </svg>
                ) : (
                  <div className="flex items-center justify-center" style={{ height: isDesktop ? "220px" : "110px", color: palette.textFaint, fontSize: "11px" }}>No public curve available</div>
                )}
              </div>
              {!isMe && !stats.statsPublic && <p className="text-xs mt-3" style={{ color: palette.textFaint }}>{p.username} hasn't shared public performance stats.</p>}
            </div>
          );
          // Icon-only tabs across the full width, active one underlined — like Instagram.
          const tabBar = (
            <div className="flex" role="tablist" aria-label="Profile sections" style={{ borderBottom: `1px solid ${palette.border}` }}>
              {[["posts", "Posts", LayoutGrid], ["stats", "Stats", TrendingUp]].map(([id, label, Icon]) => {
                const on = profileSubTab === id;
                return (
                  <button key={id} type="button" role="tab" aria-selected={on} aria-label={label} title={label} onClick={() => setProfileSubTab(id)} className={`flex-1 flex items-center justify-center ${TAP}`} style={{ position: "relative", height: isDesktop ? "54px" : "48px", background: "none", border: "none", color: on ? palette.text : palette.textFaint }}>
                    <Icon size={isDesktop ? 24 : 22} strokeWidth={on ? 2.4 : 2} />
                    <span aria-hidden="true" style={{ position: "absolute", bottom: "-1px", left: isDesktop ? "50%" : 0, right: isDesktop ? "auto" : 0, width: isDesktop ? "96px" : "auto", transform: isDesktop ? "translateX(-50%)" : "none", height: "2px", background: palette.text, opacity: on ? 1 : 0, transition: "opacity 0.15s" }} />
                  </button>
                );
              })}
            </div>
          );

          // Story-highlight circle (own profile only) — Instagram-style: shows your current
          // story ring if you have one, or lets you start a new story. No longer opens the
          // new-post composer (that's handled by the separate "New post" button/pill).
          const hasOwnStory = (storiesByAuthor[p.username] || []).length > 0;
          const ownStoryUnseen = authorHasUnseen(p.username);
          const newCircle = isMe ? (
            <div className="flex items-start" style={{ padding: isDesktop ? "0 40px 44px" : "0 16px 18px" }}>
              <button
                type="button"
                onClick={() => (hasOwnStory ? openStoryViewerFor(p.username) : openStoryComposer())}
                className={`flex flex-col items-center ${TAP}`}
                style={{ background: "none", border: "none", padding: 0, width: isDesktop ? "96px" : "72px" }}
                aria-label={hasOwnStory ? "View your story" : "Add to your story"}
              >
                <span
                  className="flex items-center justify-center rounded-full"
                  style={{
                    width: isDesktop ? "88px" : "66px",
                    height: isDesktop ? "88px" : "66px",
                    padding: "3px",
                    background: hasOwnStory ? (ownStoryUnseen ? palette.gold : palette.border) : palette.border,
                  }}
                >
                  <span className="flex items-center justify-center rounded-full w-full h-full overflow-hidden" style={{ background: palette.surface }}>
                    {hasOwnStory ? (
                      <Avatar name={p.username} size={isDesktop ? 82 : 60} src={avatarSrc} />
                    ) : (
                      <Plus size={isDesktop ? 38 : 28} strokeWidth={1.6} style={{ color: palette.textMuted }} />
                    )}
                  </span>
                </span>
                <span style={{ marginTop: "9px", color: palette.text, fontSize: isDesktop ? "13.5px" : "12px", fontWeight: 700 }}>{hasOwnStory ? "Your story" : "New"}</span>
              </button>
            </div>
          ) : null;

          if (isDesktop) {
            // Instagram-web layout: big ringed avatar left; username + actions, then
            // "N posts · N followers · N following", then bio on the right, then the tab bar
            // and a tight 3-column grid. Trading numbers live only on the Stats tab.
            return shell(
              <div style={{ paddingBottom: "64px" }}>
                <div className="flex items-start" style={{ gap: "80px", padding: "44px 24px 36px 40px" }}>
                  <div style={{ width: "160px", flexShrink: 0 }}>{avatarBlock}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span style={{ color: palette.text, fontSize: "22px", fontWeight: 600, marginRight: "6px" }}><PlanName name={p.username} /></span>
                      {actionButton}
                      {isMe && (
                        <button type="button" onClick={() => setProfileComposerOpen(true)} className={`flex items-center gap-1.5 ${TAP}`} style={pill(true, false)}>
                          <Plus size={13} /> New post
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-10" style={{ marginTop: "20px", fontSize: "15px", color: palette.textMuted }}>
                      <span><span style={{ color: palette.text, fontWeight: 800 }}>{p.postCount || 0}</span> {p.postCount === 1 ? "post" : "posts"}</span>
                      {[[p.followerCount, "followers", "followers"], [p.followingCount, "following", "following"]].map(([value, label, kind]) => (
                        <button key={kind} type="button" onClick={() => openFollowList(p.username, kind)} className={TAP} style={{ background: "none", border: "none", padding: 0, fontSize: "15px", color: palette.textMuted, fontFamily: sans }}>
                          <span style={{ color: palette.text, fontWeight: 800 }}>{value || 0}</span> {label}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap" style={{ marginTop: "14px" }}>
                      {p.verifiedPnl && <span style={chip}>Verified P&L</span>}
                      {!isMe && p.followsMe && <span style={{ color: palette.textMuted, background: palette.field, border: `1px solid ${palette.border}`, borderRadius: "999px", padding: "2px 8px", fontSize: "10.5px", fontWeight: 600 }}>Follows you</span>}
                    </div>
                    <div style={{ maxWidth: "440px" }}>{bioBlock}</div>
                  </div>
                </div>

                {newCircle}
                {tabBar}
                <div>
                  {profileSubTab === "posts" ? postsGrid : statsPanel}
                </div>
              </div>
            );
          }

          // Mobile: Instagram layout — photo on the left, Posts / Followers / Following beside it,
          // name + bio underneath, then a full-width action row, tabs, and the grid.
          return shell(
            <div className="flex-1" style={{ overflowY: "auto", minHeight: 0, paddingBottom: "max(28px, env(safe-area-inset-bottom))" }}>
              <div className="flex items-center gap-4 px-4" style={{ paddingTop: "18px" }}>
                {avatarBlock}
                <div className="flex flex-1 items-center justify-around">
                  {[[p.postCount, "Posts", null], [p.followerCount, "Followers", "followers"], [p.followingCount, "Following", "following"]].map(([value, label, kind]) => (
                    <button key={label} type="button" disabled={!kind} onClick={() => kind && openFollowList(p.username, kind)} className={`flex flex-col items-center ${kind ? TAP : ""}`} style={{ background: "none", border: "none", padding: "2px 4px", cursor: kind ? "pointer" : "default" }}>
                      <span style={{ color: palette.text, fontSize: "18px", fontWeight: 800, lineHeight: 1.2 }}>{(value || 0).toLocaleString()}</span>
                      <span style={{ color: palette.textMuted, fontSize: "12.5px", marginTop: "1px" }}>{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="px-4" style={{ paddingTop: "12px" }}>
                {nameRow}
                {bioBlock}
              </div>

              <div className="flex items-center gap-2 px-4" style={{ paddingTop: "14px", paddingBottom: "16px" }}>
                {actionButton}
                {isMe && !bioEditing && (
                  <button type="button" onClick={() => setProfileComposerOpen(true)} className={`flex items-center justify-center gap-1.5 ${TAP}`} style={{ ...pill(true, false), flex: 1 }}>
                    <Plus size={14} /> New post
                  </button>
                )}
              </div>

              {newCircle}
              {tabBar}

              {profileSubTab === "posts" ? postsGrid : statsPanel}
            </div>
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
                                background: row.isFollowedByMe ? palette.field : palette.gold,
                                border: `1px solid ${row.isFollowedByMe ? palette.border : "transparent"}`,
                                color: row.isFollowedByMe ? palette.text : palette.letterbox,
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
                {po.text && <div style={{ color: "#FFFFFF", fontSize: "14px", lineHeight: 1.5, marginBottom: "10px", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{po.text}</div>}
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
            split ? (
              <div className="flex items-start gap-3 px-4 pt-5 pb-3">
                <Avatar name={po.author} size={40} src={profileData?.avatar || avatarForAuthor(po.author)} />
                <div className="min-w-0 flex-1">
                  <p style={{ color: palette.text, fontSize: "14.5px", lineHeight: 1.5, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                    <span style={{ fontWeight: 700, marginRight: "6px" }}><PlanName name={po.author} /></span>{po.text}
                  </p>
                  <span style={{ color: palette.textFaint, fontSize: "12px" }}>{feedTimeAgo(po.ts)}</span>
                </div>
              </div>
            ) : (
              <div className="px-4 pb-2">
                <p style={{ color: palette.text, fontSize: "13.5px", lineHeight: 1.5, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                  <span style={{ fontWeight: 700, marginRight: "6px" }}><PlanName name={po.author} /></span>{po.text}
                </p>
              </div>
            )
          ) : null;
          const thread = (
            <div className="px-4 pt-2 pb-3">
              {profileCommentsLoading ? (
                <p style={{ color: palette.textFaint, fontSize: "12px" }}>Loading comments…</p>
              ) : profileComments.length === 0 ? (
                <div className="text-center" style={{ padding: split ? "56px 0" : "20px 0" }}>
                  <div style={{ color: palette.text, fontSize: split ? "18px" : "14px", fontWeight: 800 }}>No comments yet</div>
                  <div style={{ color: palette.textFaint, fontSize: "12.5px", marginTop: "4px" }}>Start the conversation.</div>
                </div>
              ) : (
                profileComments.map((c) => {
                  const canDeleteComment = c.author === communityUsername || po.author === communityUsername;
                  return (
                    <div key={c.id} className="flex items-start gap-3 mb-4">
                      <button type="button" onClick={() => { setProfilePostOpen(null); openCommunityMemberProfile(c.author); }} className={`flex-shrink-0 ${TAP}`} style={{ background: "none", border: "none", padding: 0 }} aria-label={`Open ${c.author}'s profile`}>
                        <Avatar name={c.author} size={split ? 40 : 32} src={c.author === communityUsername ? (communityAvatar || avatarForAuthor(c.author)) : avatarForAuthor(c.author)} />
                      </button>
                      <div className="min-w-0 flex-1">
                        <p style={{ color: palette.text, fontSize: split ? "14.5px" : "13.5px", lineHeight: 1.5, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                          <span style={{ fontWeight: 700, marginRight: "6px" }}><PlanName name={c.author} /></span>
                          {c.author === po.author && <span style={{ color: palette.gold, background: `${palette.gold}14`, border: `1px solid ${palette.gold}33`, borderRadius: "999px", padding: "0 7px", fontSize: "10px", fontWeight: 700, marginRight: "6px" }}>Author</span>}
                          {c.text}
                        </p>
                        <div className="flex items-center gap-3" style={{ marginTop: "2px" }}>
                          <span style={{ color: palette.textFaint, fontSize: "12px" }}>{feedTimeAgo(c.ts)}</span>
                          {canDeleteComment && (
                            <button type="button" onClick={() => deleteProfileComment(c.id)} className={TAP} style={{ background: "none", border: "none", padding: 0, color: palette.textFaint, fontSize: "12px", fontWeight: 700 }}>Delete</button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          );
          const actions = (
            <div className="px-4 pt-3.5 pb-3 flex-shrink-0" style={{ borderTop: split ? `1px solid ${palette.border}` : "none" }}>
              <div className="flex items-center" style={{ gap: "18px" }}>
                <button type="button" onClick={() => likeProfilePost(po.id)} className={TAP} style={{ background: "none", border: "none", padding: 0, display: "flex" }} aria-label={po.liked ? "Unlike" : "Like"} aria-pressed={!!po.liked}>
                  <Heart size={27} fill={po.liked ? palette.red : "none"} color={po.liked ? palette.red : palette.text} strokeWidth={po.liked ? 0 : 2} />
                </button>
                <button type="button" onClick={() => profileCommentInputRef.current && profileCommentInputRef.current.focus()} className={TAP} style={{ background: "none", border: "none", padding: 0, display: "flex" }} aria-label="Comment">
                  <MessageCircle size={27} color={palette.text} />
                </button>
              </div>
              <div style={{ marginTop: "10px", color: palette.text, fontSize: "14px", fontWeight: 700 }}>{likes} {likes === 1 ? "like" : "likes"}</div>
              <div style={{ marginTop: "2px", color: palette.textFaint, fontSize: "12.5px" }}>{dateLabel}</div>
            </div>
          );
          const inputBar = (
            <div className="relative flex-shrink-0" style={{ borderTop: `1px solid ${palette.border}`, paddingBottom: isDesktop ? 0 : "env(safe-area-inset-bottom, 0px)" }}>
              {profileEmojiOpen && (
                <div className="absolute grid" style={{ left: "12px", bottom: "calc(100% + 6px)", zIndex: 5, gridTemplateColumns: "repeat(8, 1fr)", gap: "2px", padding: "8px", background: palette.surface, border: `1px solid ${palette.border}`, borderRadius: "12px", boxShadow: palette.shadow }}>
                  {EMOJIS.map((em) => (
                    <button key={em} type="button" onClick={() => { setProfileCommentDraft((d) => (d + em).slice(0, 500)); if (profileCommentInputRef.current) profileCommentInputRef.current.focus(); }} className={TAP} style={{ background: "none", border: "none", width: "32px", height: "32px", fontSize: "19px", borderRadius: "8px" }}>{em}</button>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-3 px-4" style={{ height: isDesktop ? "64px" : "56px" }}>
                <button type="button" onClick={() => setProfileEmojiOpen((v) => !v)} className={TAP} style={{ background: "none", border: "none", padding: 0, display: "flex", color: profileEmojiOpen ? palette.gold : palette.text }} aria-label="Emoji" aria-expanded={profileEmojiOpen}>
                  <Smile size={26} />
                </button>
                <input
                  ref={profileCommentInputRef}
                  type="text"
                  value={profileCommentDraft}
                  onChange={(e) => setProfileCommentDraft(e.target.value.slice(0, 500))}
                  onFocus={() => setProfileEmojiOpen(false)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); postProfileComment(); } }}
                  placeholder="Add a comment…"
                  className="flex-1 bg-transparent outline-none"
                  style={{ color: palette.text, fontSize: "14.5px", fontFamily: sans, minWidth: 0 }}
                />
                <button type="button" onClick={postProfileComment} disabled={!canSend} className={TAP} style={{ background: "none", border: "none", padding: 0, color: canSend ? palette.gold : palette.textFaint, fontSize: "14px", fontWeight: 700, fontFamily: sans, opacity: canSend ? 1 : 0.6 }}>
                  {profileCommentSending ? "Posting…" : "Post"}
                </button>
              </div>
              {profileError && <p className="px-4 pb-2" style={{ color: palette.red, fontSize: "11.5px" }}>{profileError}</p>}
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

        {profileComposerOpen && (() => {
          const canShare = !profilePostSubmitting && (!!profilePostText.trim() || !!profilePostImage);
          const closeComposer = () => { if (!profilePostSubmitting) setProfileComposerOpen(false); };
          const mediaPane = (
            <div
              className="relative flex items-center justify-center"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files && e.dataTransfer.files[0];
                if (f && f.type.startsWith("image/")) uploadProfilePostImage(f);
              }}
              style={{ flex: isDesktop ? 1 : "none", minWidth: 0, aspectRatio: isDesktop ? undefined : "1 / 1", background: palette.letterbox }}
            >
              {profilePostImage ? (
                <>
                  <img src={profilePostImage} alt="" style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
                  <button type="button" onClick={() => setProfilePostImage(null)} className={`absolute flex items-center justify-center rounded-full ${TAP}`} style={{ top: "10px", right: "10px", width: "30px", height: "30px", background: "rgba(5,7,12,0.72)", color: "#fff" }} aria-label="Remove photo">
                    <X size={15} />
                  </button>
                </>
              ) : (
                <div className="flex flex-col items-center text-center px-6">
                  <span className="flex items-center justify-center rounded-full" style={{ width: "72px", height: "72px", background: `${palette.gold}14`, border: `1px solid ${palette.gold}33` }}>
                    <Camera size={30} style={{ color: palette.gold }} />
                  </span>
                  <p style={{ color: palette.text, fontSize: "16px", fontWeight: 600, marginTop: "16px" }}>{isDesktop ? "Drag a photo here" : "Add a photo"}</p>
                  <p style={{ color: palette.textFaint, fontSize: "12px", marginTop: "4px" }}>Or just write a caption on the right.</p>
                  <button
                    type="button"
                    onClick={() => profilePostImageInputRef.current && profilePostImageInputRef.current.click()}
                    disabled={profilePostImageUploading}
                    className={TAP}
                    style={{ marginTop: "16px", height: "34px", padding: "0 18px", borderRadius: "8px", background: palette.gold, color: palette.letterbox, border: "none", fontSize: "13px", fontWeight: 700, fontFamily: sans, opacity: profilePostImageUploading ? 0.6 : 1 }}
                  >
                    {profilePostImageUploading ? "Uploading…" : "Select from device"}
                  </button>
                </div>
              )}
            </div>
          );
          const captionPane = (
            <div className="flex flex-col" style={{ width: isDesktop ? "340px" : "100%", flexShrink: 0, borderLeft: isDesktop ? `1px solid ${palette.border}` : "none" }}>
              <div className="flex items-center gap-2.5 px-4 pt-4 pb-2">
                <Avatar name={communityUsername} size={30} src={communityAvatar || undefined} />
                <span style={{ color: palette.text, fontSize: "13.5px", fontWeight: 700 }}>{communityUsername}</span>
              </div>
              <textarea
                value={profilePostText}
                onChange={(e) => setProfilePostText(e.target.value.slice(0, 1000))}
                rows={isDesktop ? 10 : 4}
                autoFocus
                placeholder="Write a caption…"
                className="w-full bg-transparent outline-none px-4"
                style={{ color: palette.text, fontSize: "14px", fontFamily: sans, resize: "none", lineHeight: 1.5, border: "none" }}
              />
              <div className="flex items-center justify-between px-4 py-2.5" style={{ borderTop: `1px solid ${palette.border}` }}>
                {profilePostImage ? (
                  <button type="button" onClick={() => profilePostImageInputRef.current && profilePostImageInputRef.current.click()} disabled={profilePostImageUploading} className={TAP} style={{ background: "none", border: "none", padding: 0, color: palette.textMuted, fontSize: "12px", fontWeight: 700 }}>
                    {profilePostImageUploading ? "Uploading…" : "Change photo"}
                  </button>
                ) : <span />}
                <span style={{ color: palette.textFaint, fontSize: "11.5px", fontFamily: mono }}>{profilePostText.length}/1000</span>
              </div>
              {profileError && <p className="px-4 pb-3" style={{ color: palette.red, fontSize: "11.5px" }}>{profileError}</p>}
            </div>
          );
          return (
            <div className="fixed inset-0 flex items-center justify-center" style={{ padding: isDesktop ? "16px" : 0, background: "rgba(5,7,12,0.85)", backdropFilter: "blur(5px)", WebkitBackdropFilter: "blur(5px)", zIndex: 122 }} onClick={closeComposer}>
              <div className="w-full overflow-hidden" style={{ maxWidth: isDesktop ? "880px" : "none", height: isDesktop ? "auto" : "100%", maxHeight: isDesktop ? "92vh" : "none", display: "flex", flexDirection: "column", background: palette.surface, border: isDesktop ? `1px solid ${palette.border}` : "none", borderRadius: isDesktop ? "16px" : 0, boxShadow: palette.shadow }} onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between px-4 flex-shrink-0" style={{ height: isDesktop ? "48px" : "calc(48px + env(safe-area-inset-top, 0px))", paddingTop: isDesktop ? 0 : "env(safe-area-inset-top, 0px)", borderBottom: `1px solid ${palette.border}` }}>
                  <button type="button" onClick={closeComposer} className={TAP} style={{ background: "none", border: "none", padding: 0, color: palette.textMuted, fontSize: "13.5px", fontWeight: 600 }}>Cancel</button>
                  <span style={{ color: palette.text, fontSize: "14px", fontWeight: 700 }}>Create new post</span>
                  <button type="button" onClick={createProfilePost} disabled={!canShare} className={TAP} style={{ background: "none", border: "none", padding: 0, color: canShare ? palette.gold : palette.textFaint, fontSize: "13.5px", fontWeight: 700, opacity: canShare ? 1 : 0.6 }}>
                    {profilePostSubmitting ? "Sharing…" : "Share"}
                  </button>
                </div>
                <input ref={profilePostImageInputRef} type="file" accept="image/*" onChange={handleProfilePostImageChange} style={{ display: "none" }} />
                <div style={{ display: "flex", flexDirection: isDesktop ? "row" : "column", height: isDesktop ? "min(72vh, 560px)" : "auto", flex: isDesktop ? "none" : "1 1 auto", overflowY: isDesktop ? "hidden" : "auto", minHeight: 0 }}>
                  {mediaPane}
                  {captionPane}
                </div>
              </div>
            </div>
          );
        })()}

        {storyDraft && (
          <div className="fixed inset-0 flex items-center justify-center" style={{ background: "#000000", zIndex: 135 }}>
            <div className="relative w-full h-full flex flex-col" style={{ maxWidth: isDesktop ? "420px" : "100%", margin: "0 auto" }}>
              <div className="flex items-center justify-between px-3 pt-3 pb-2 flex-shrink-0">
                <button type="button" onClick={cancelStoryDraft} className={`flex items-center justify-center rounded-full ${TAP}`} style={{ width: "32px", height: "32px", background: "rgba(255,255,255,0.12)", color: "#FFFFFF" }} aria-label="Cancel story">
                  <X size={16} />
                </button>
                <span style={{ color: "#FFFFFF", fontSize: "14px", fontWeight: 700 }}>New story</span>
                <span style={{ width: "32px" }} />
              </div>
              <div className="flex-1 flex items-center justify-center px-4" style={{ minHeight: 0 }}>
                <img src={storyDraft.image} alt="Story preview" className="rounded-xl" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
              </div>
              <div className="flex items-center gap-2 px-3 pb-4 pt-3 flex-shrink-0">
                <input
                  type="text"
                  value={storyCaption}
                  onChange={(e) => setStoryCaption(e.target.value.slice(0, 200))}
                  placeholder="Add a caption…"
                  className="flex-1 rounded-full px-4 py-2.5 outline-none"
                  style={{ background: "rgba(255,255,255,0.12)", color: "#FFFFFF", fontSize: "13px", border: "1px solid rgba(255,255,255,0.18)" }}
                />
                <button
                  type="button"
                  onClick={postStory}
                  disabled={storyPosting}
                  className={`px-4 py-2.5 rounded-full ${TAP}`}
                  style={{ background: palette.gold, color: palette.letterbox, fontFamily: mono, fontSize: "12px", fontWeight: 800, opacity: storyPosting ? 0.6 : 1 }}
                >
                  {storyPosting ? "Posting…" : "Post story"}
                </button>
              </div>
            </div>
          </div>
        )}

        {storyViewer && (() => {
          const author = storyAuthorOrder[storyViewer.authorIdx];
          const slides = storiesByAuthor[author] || [];
          const slide = slides[storyViewer.slideIdx];
          if (!author || !slide) return null;
          const isMine = author === communityUsername;
          const pnlPositive = slide.pnl && !slide.pnl.trim().startsWith("-");

          const handlePress = () => setStoryPaused(true);
          const handleRelease = () => setStoryPaused(false);
          const handleTapZone = (dir) => (e) => {
            e.stopPropagation();
            advanceStory(dir);
          };

          return (
            <div
              className="fixed inset-0 flex items-center justify-center"
              style={{ background: "#000000", zIndex: 130 }}
              onMouseDown={handlePress}
              onMouseUp={handleRelease}
              onMouseLeave={handleRelease}
              onTouchStart={handlePress}
              onTouchEnd={handleRelease}
            >
              <div className="relative w-full h-full flex flex-col" style={{ maxWidth: isDesktop ? "420px" : "100%", margin: "0 auto" }}>
                {/* progress segments */}
                <div className="flex gap-1 px-2.5 pt-2.5 flex-shrink-0" style={{ zIndex: 2 }}>
                  {slides.map((s, i) => (
                    <div key={s.id || i} className="flex-1 rounded-full overflow-hidden" style={{ height: "2.5px", background: "rgba(255,255,255,0.28)" }}>
                      <div
                        style={{
                          height: "100%",
                          width: i < storyViewer.slideIdx ? "100%" : i === storyViewer.slideIdx ? `${storyProgressPct}%` : "0%",
                          background: "#FFFFFF",
                          transition: i === storyViewer.slideIdx ? "none" : "width 0.15s linear",
                        }}
                      />
                    </div>
                  ))}
                </div>

                {/* header */}
                <div className="flex items-center justify-between px-3 pt-2.5 pb-2 flex-shrink-0" style={{ zIndex: 2 }}>
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar name={author} size={30} src={avatarForAuthor(author)} />
                    <div className="min-w-0">
                      <div className="truncate" style={{ color: "#FFFFFF", fontSize: "13px", fontWeight: 700 }}>{isMine ? "Your story" : author}</div>
                      <div style={{ color: "rgba(255,255,255,0.65)", fontSize: "10.5px", fontFamily: mono }}>{feedTimeAgo(slide.ts)}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {isMine && (
                      <button type="button" onClick={(e) => { e.stopPropagation(); const left = slides.length - 1; deleteStory(slide.id); if (left <= 0) closeStoryViewer(); else setStoryViewer((cur) => cur && { ...cur, slideIdx: Math.min(cur.slideIdx, left - 1) }); }} className={TAP} style={{ color: "rgba(255,255,255,0.75)" }} aria-label="Delete story">
                        <Trash2 size={16} />
                      </button>
                    )}
                    <button type="button" onClick={closeStoryViewer} className={`flex items-center justify-center rounded-full ${TAP}`} style={{ width: "28px", height: "28px", background: "rgba(255,255,255,0.12)", color: "#FFFFFF" }} aria-label="Close story">
                      <X size={15} />
                    </button>
                  </div>
                </div>

                {/* slide content */}
                <div className="relative flex-1 flex items-center justify-center px-4" style={{ minHeight: 0 }}>
                  <div className="absolute inset-y-0 left-0" style={{ width: "35%", zIndex: 3 }} onClick={handleTapZone(-1)} />
                  <div className="absolute inset-y-0 right-0" style={{ width: "35%", zIndex: 3 }} onClick={handleTapZone(1)} />

                  {slide.image ? (
                    <img src={slide.image} alt="Story" className="rounded-xl" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
                  ) : (
                    <div className="w-full rounded-2xl p-6 text-center" style={{ background: "#171B24", border: `1px solid rgba(255,255,255,0.1)` }}>
                      {slide.text && <p style={{ color: "#F5F6F9", fontSize: "16px", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{slide.text}</p>}
                    </div>
                  )}

                  {slide.image && slide.text && (
                    <div className="absolute" style={{ left: "16px", right: "16px", bottom: "12px", zIndex: 4, textAlign: "center", color: "#FFFFFF", fontSize: "14px", lineHeight: 1.4, background: "rgba(0,0,0,0.5)", padding: "8px 12px", borderRadius: "12px", whiteSpace: "pre-wrap" }}>
                      {slide.text}
                    </div>
                  )}

                  {slide.pnl && (
                    <span
                      className="absolute"
                      style={{
                        bottom: "14px", left: "50%", transform: "translateX(-50%)",
                        background: pnlPositive ? `${palette.green}cc` : `${palette.red}cc`,
                        color: "#0A0C11", fontSize: "12.5px", fontWeight: 800, padding: "5px 13px", borderRadius: "999px", fontFamily: mono, zIndex: 4,
                      }}
                    >
                      {slide.pnl}
                    </span>
                  )}
                </div>

                {/* reactions on the story itself — tap to react, tap again to undo */}
                <div className="flex items-center justify-center gap-2 px-3 pb-4 pt-2 flex-shrink-0" style={{ zIndex: 2 }} onClick={(e) => e.stopPropagation()}>
                  {FEED_REACTIONS.map((r) => {
                    const count = (slide.reactions && slide.reactions[r.key]) || 0;
                    const active = myStoryReactions[slide.id] === r.key;
                    return (
                      <button
                        key={r.key}
                        type="button"
                        onClick={() => toggleStoryReaction(slide.id, r.key)}
                        className={`flex items-center gap-1 ${TAP}`}
                        style={{
                          color: "#FFFFFF", fontSize: "12px", fontFamily: mono, fontWeight: 700,
                          background: active ? "rgba(224,172,95,0.25)" : "rgba(255,255,255,0.1)",
                          border: `1px solid ${active ? palette.gold : "rgba(255,255,255,0.18)"}`,
                          borderRadius: "999px", padding: "5px 10px",
                        }}
                      >
                        <span style={{ fontSize: "14px" }}>{r.emoji}</span>{count > 0 && count}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })()}
    </>
  );
  
  return body;
}
