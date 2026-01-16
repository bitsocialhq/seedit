import { useEffect } from 'react';
import { Outlet, Route, Routes } from 'react-router-dom';
import { initializeNotificationSystem } from './lib/push';
import useTheme from './hooks/use-theme';
import { useAutoSubscribe } from './hooks/use-auto-subscribe';
import AboutView from './views/about';
import All from './views/all';
import Author from './views/author';
import Domain from './views/domain';
import Home from './views/home';
import Inbox from './views/inbox';
import Mod from './views/mod';
import NotFound from './views/not-found';
import PostPage from './views/post-page';
import Profile from './views/profile';
import Settings from './views/settings';
import AccountDataEditor from './views/settings/account-data-editor';
import SubplebbitDataEditor from './views/subplebbit-settings/subplebbit-data-editor';
import SubmitPage from './views/submit-page';
import Subplebbit from './views/subplebbit';
import SubplebbitSettings from './views/subplebbit-settings';
import Subplebbits from './views/subplebbits';
import AccountBar from './components/account-bar/';
import ChallengeModal from './components/challenge-modal';
import Header from './components/header';
import NotificationHandler from './components/notification-handler';
import StickyHeader from './components/sticky-header';
import TopBar from './components/topbar';
import styles from './app.module.css';

initializeNotificationSystem();

const App = () => {
  useAutoSubscribe();

  const globalLayout = (
    <>
      <ChallengeModal />
      <NotificationHandler />
      <Outlet />
    </>
  );

  const pagesLayout = (
    <>
      <TopBar />
      <AccountBar />
      <Header />
      <Outlet />
    </>
  );

  const feedLayout = (
    <>
      <StickyHeader />
      <Header />
      <Outlet />
    </>
  );

  // add theme className to body so it can set the correct body background in index.css
  const [theme] = useTheme();
  useEffect(() => {
    document.body.classList.forEach((className) => document.body.classList.remove(className));
    document.body.classList.add(theme);
  }, [theme]);

  return (
    <div className={`${styles.app} ${theme}`}>
      <div className='asset-preloader'>
        <div className='asset-preloader-seedit-text-light'></div>
        <div className='asset-preloader-seedit-text-dark'></div>
        <div className='asset-preloader-delete-button-hover'></div>
        <div className='asset-preloader-close-x-button-large-hover'></div>
        <div className='asset-preloader-play-button-hover'></div>
        <div className='asset-preloader-text-button-hover'></div>
        <div className='asset-preloader-button-large-hover-dark'></div>
        <div className='asset-preloader-button-large-hover'></div>
        <div className='asset-preloader-button-large-nub-hover-dark'></div>
        <div className='asset-preloader-button-large-nub-hover'></div>
        <div className='asset-preloader-close-button-hover'></div>
        <div className='asset-preloader-all-feed-subscribe-hover'></div>
        <div className='asset-preloader-arrow-upvoted'></div>
        <div className='asset-preloader-arrow-downvoted'></div>
      </div>

      <Routes>
        <Route element={globalLayout}>
          <Route element={pagesLayout}>
            <Route path='/about' element={<AboutView />} />
            <Route path='/submit' element={<SubmitPage />} />

            <Route path='/s/:subplebbitAddress/c/:commentCid' element={<PostPage />} />
            <Route path='/s/:subplebbitAddress/c/:commentCid/about' element={<AboutView />} />

            <Route path='/s/:subplebbitAddress/submit' element={<SubmitPage />} />
            <Route path='/s/:subplebbitAddress/about' element={<AboutView />} />

            <Route path='/settings' element={<Settings />} />
            <Route path='/s/:subplebbitAddress/settings' element={<SubplebbitSettings />} />
            <Route path='/s/:subplebbitAddress/settings/editor' element={<SubplebbitDataEditor />} />
            <Route path='/settings/plebbit-options' element={<Settings />} />
            <Route path='/settings/content-options' element={<Settings />} />
            <Route path='/settings/account-data' element={<AccountDataEditor />} />

            <Route path='/profile/about' element={<AboutView />} />

            <Route path='/u/:authorAddress/c/:commentCid/about' element={<AboutView />} />

            <Route path='/inbox' element={<Inbox />} />
            <Route path='/inbox/unread' element={<Inbox />} />
            <Route path='/inbox/commentreplies' element={<Inbox />} />
            <Route path='/inbox/postreplies' element={<Inbox />} />

            <Route path='/communities' element={<Subplebbits />} />
            <Route path='/communities/subscriber' element={<Subplebbits />} />
            <Route path='/communities/moderator' element={<Subplebbits />} />
            <Route path='/communities/admin' element={<Subplebbits />} />
            <Route path='/communities/owner' element={<Subplebbits />} />
            <Route path='/communities/vote' element={<Subplebbits />} />
            <Route path='/communities/vote/passing' element={<Subplebbits />} />
            <Route path='/communities/vote/rejecting' element={<Subplebbits />} />
            <Route path='/communities/create' element={<SubplebbitSettings />} />
          </Route>
          <Route element={feedLayout}>
            <Route path='/:sortType?/:timeFilterName?' element={<Home />} />

            <Route path='/s/all/:sortType?/:timeFilterName?' element={<All />} />

            <Route path='/s/mod/:sortType?/:timeFilterName?' element={<Mod />} />

            <Route path='/s/:subplebbitAddress/:sortType?/:timeFilterName?' element={<Subplebbit />} />

            <Route path='/domain/:domain/:sortType?/:timeFilterName?' element={<Domain />} />

            <Route path='/profile/:accountCommentIndex' element={<PostPage />} />

            <Route path='/profile' element={<Profile />}>
              <Route index element={<Profile.Overview />} />
              <Route path='upvoted' element={<Profile.VotedComments voteType={1} />} />
              <Route path='downvoted' element={<Profile.VotedComments voteType={-1} />} />
              <Route path='hidden' element={<Profile.HiddenComments />} />
              <Route path='comments' element={<Profile.Comments />} />
              <Route path='submitted' element={<Profile.Submitted />} />
            </Route>

            <Route path='/u/:authorAddress/c/:commentCid?/:sortType?/:timeFilterName?' element={<Author />} />
            <Route path='/u/:authorAddress/c/:commentCid?/comments/:sortType?/:timeFilterName?' element={<Author />} />
            <Route path='/u/:authorAddress/c/:commentCid?/submitted/:sortType?/:timeFilterName?' element={<Author />} />

            <Route path='*' element={<NotFound />} />
            <Route path='/not-found' element={<NotFound />} />
          </Route>
        </Route>
      </Routes>
    </div>
  );
};

export default App;
