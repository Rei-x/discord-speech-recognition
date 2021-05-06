import { Filter } from "ytdl-core";

const ytsr = require('ytsr');

interface ytsrResponse {
  items: Array<ytsrVideo>,
}
export interface ytsrVideo {
  url: string,
  title: string
}
/**
 * Looks for a video on [youtube.com](https://youtube.com) basing on _query_
 * @param query What to look for on youtube
 * @returns Object with url and title of a video.
 */
export function getVideoFromQuery(query: string): Promise<ytsrVideo> {
  return new Promise((resolve, reject) => {
    ytsr.getFilters(query).then((filter: Map<string, Map<string, Filter>>) => {
      if (!filter || !filter.get('Type') || !filter.get('Type')!.get('Video')) reject();

      const searchResult = filter.get('Type')!.get('Video');
      ytsr((searchResult as any).url, {
        limit: 1,
      }).then((result: ytsrResponse) => {
        const firstResult = result.items[0];
        resolve({
          'url': firstResult.url,
          'title': firstResult.title,
        });
      });
    });
  });
};
