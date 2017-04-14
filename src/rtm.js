import slack from '@slack/client';

const rtm = new slack.RtmClient(process.env.SLACK_BOT_TOKEN);

rtm.start();

export default rtm;
