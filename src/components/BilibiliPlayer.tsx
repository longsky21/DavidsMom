import React from 'react';

interface BilibiliPlayerProps {
  url: string;
  title?: string;
}

const BilibiliPlayer: React.FC<BilibiliPlayerProps> = ({ url, title }) => {
  // Extract BVID from URL
  const getBvid = (url: string) => {
    const match = url.match(/\/video\/(BV[a-zA-Z0-9]+)/);
    return match ? match[1] : null;
  };

  const bvid = getBvid(url);

  if (!bvid) {
    return <div className="text-red-500">Invalid Bilibili Video URL</div>;
  }

  return (
    <div className="w-full aspect-video rounded-xl overflow-hidden shadow-lg bg-black">
      <iframe
        src={`//player.bilibili.com/player.html?bvid=${bvid}&page=1&high_quality=1&danmaku=0`}
        scrolling="no"
        frameBorder="0"
        allowFullScreen={true}
        className="w-full h-full"
        title={title || "Bilibili Video"}
      ></iframe>
    </div>
  );
};

export default BilibiliPlayer;
