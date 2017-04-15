import slack from '@slack/client';
import moment from 'moment';
import schedule from 'node-schedule';

import rtm from '../rtm';

import episodes from './episodes';
import otherResources from './other-resources';
import config from './config';

let channels;

const episodeOfTheDay = (date) => {
	const episodeNumber = date.diff(config.startDate, 'days') + 1;

	if (episodeNumber > episodes.length) {
		return null;
	}

	return episodes[episodeNumber - 1];
};

const channelID = (originalChannel) => {
	if (originalChannel.charAt(0) === '#' || originalChannel.charAt(0) === '@') {
		return channels.filter((channel) => {
			return channel.name === originalChannel.substring(1);
		})[0].id;
	}

	return originalChannel;
};

const announceMessage = (channel = config.defaultChannel, force = false, date = moment()) => {
	const episode = episodeOfTheDay(date);

	if (episode) {
		setTimeout(() => {
			rtm.sendMessage(`
Today's episode is *${episode.title}*!
:tv: Stream: ${encodeURI(episode.streamURL)}
:rocket: Code: ${encodeURI(episode.sourceURL)}
				`,
				channelID(channel)
			);
		}, 250);
	} else if (force) {
		const resource = otherResources[0];

		setTimeout(() => {
			rtm.sendMessage(`
We've completed the #JavaScript30 course :tada:
There are lots of other cool resources for learning JavaScript. Try ${resource}!
				`,
				channelID(channel)
			);
		}, 250);
	}
}

export default () => {
	rtm.on(slack.CLIENT_EVENTS.RTM.AUTHENTICATED, (rtmStartData) => {
		channels = rtmStartData.channels;

		schedule.scheduleJob({hour: 12, minute: 0, seconds: 1}, () => {
			announceMessage();
		});
	});

	rtm.on(slack.RTM_EVENTS.MESSAGE, (message) => {
		if (!message.text) return;

		if (
			message.text.includes(`<@${rtm.activeUserId}>`) &&
			(
				message.text.toLowerCase().includes(`episode of the day`) ||
				message.text.toLowerCase().includes(`today's episode`) ||
				message.text.toLowerCase().includes(`current episode`)
			)
		) {
			announceMessage(message.channel);
		}
	});
}
