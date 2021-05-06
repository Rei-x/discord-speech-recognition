import { ClientRequest } from "http";

const https = require('https');

/**
 * Searches for image on [imgur.com](https://imgur.com) and returns url
 * @param clientId Client ID that you can obtain [here](https://api.imgur.com/oauth2/addclient)
 * @param query What to look for
 * @returns The result of promise will be a url of the photo
 */
export function getImageURLFromQuery(clientId: string, query: string): Promise<string> {
  const options = {
    host: 'api.imgur.com',
    path: encodeURI('/3/gallery/search/top?q=' + query + '&q_type=png'),
    headers: {
      'Authorization': 'Client-ID ' + clientId,
    },
  };
  return new Promise((resolve, reject) => {
    https.request(options, (response: ClientRequest) => {
      let str = '';

      response.on('data', (chunk: string) => {
        str += chunk;
      });

      response.on('end', () => {
        resolve(JSON.parse(str).data[0].images[0].link);
      });
    }).end();
  });
};
