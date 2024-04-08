import * as dotenv from 'dotenv';
import FS from 'fs';
import * as process from 'process';
import { text } from 'stream/consumers';

import { BskyAgent, RichText } from '@atproto/api';

dotenv.config();

// Create a Bluesky Agent 
const agent = new BskyAgent({
    service: 'https://bsky.social',
  })


async function main() {

    const fTweets = FS.readFileSync(process.env.ARCHIVE_FOLDER + "/data/tweets.json");
    const tweets = JSON.parse(fTweets.toString());
    if (tweets != null && tweets.length > 0) {
      const sortedTweets = tweets.sort((a, b) => {
        let ad = new Date(a.tweet.created_at).getTime();
        let bd = new Date(b.tweet.created_at).getTime();
        return ad - bd;
      });

      await agent.login({ identifier: process.env.BLUESKY_USERNAME!, password: process.env.BLUESKY_PASSWORD!})

      for (let index = 0; index < sortedTweets.length; index++) {
        const tweet = sortedTweets[index].tweet;
        const tweet_createdAt = new Date(tweet.created_at).toISOString();

        // if (tweet.id != "1586630236405469189") 
        //     continue;

        console.log(`Parse tweet id '${tweet.id}'`);
        console.log(` Created at ${tweet_createdAt}`);
        console.log(` Full text '${tweet.full_text}'`);

        if (tweet.in_reply_to_screen_name) {
          console.log("Discarded (reply)");
          continue;
        }
        if (tweet.full_text.startsWith("@")) {
          console.log("Discarded (start with @)");
          continue;
        }
        if (tweet.full_text.startsWith("RT ")) {
          console.log("Discarded (start with RT)");
          continue;
        }

        const rt = new RichText({
            text: tweet.full_text
        });

        await rt.detectFacets(agent);
        const postRecord = {
            $type: 'app.bsky.feed.post',
            text: rt.text,
            facets: rt.facets,
            createdAt: tweet_createdAt,
        }

        const recordData = await agent.post(postRecord);
        const i = recordData.uri.lastIndexOf("/");
        if (i > 0) {
          const rkey = recordData.uri.substring(i + 1);
          const postUri = `https://bsky.app/profile/${process.env.BLUESKY_USERNAME!}/post/${rkey}`;
          console.log("Blusky post create, URI: " + postUri);
        } else {
          console.log(recordData);
        }
  
        if (index > 5) 
            break;
      }
    }
}

main();