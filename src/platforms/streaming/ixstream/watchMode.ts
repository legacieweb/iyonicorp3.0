type NavigateTo = (path: string) => void;

export const openIxStreamWatchMode = (navigate: NavigateTo, contentId: string, episodeId?: string) => {
  const episodeParam = episodeId ? `&episode=${encodeURIComponent(episodeId)}` : '';
  const path = `/ixstream/show/${encodeURIComponent(contentId)}?mode=watch&fullscreen=1${episodeParam}`;
  if (document.fullscreenElement) {
    navigate(path);
    return;
  }

  const requestFullscreen = document.documentElement.requestFullscreen;
  if (!requestFullscreen) {
    navigate(path);
    return;
  }

  void document.documentElement.requestFullscreen()
    .then(() => navigate(path))
    .catch(() => navigate(path));
};