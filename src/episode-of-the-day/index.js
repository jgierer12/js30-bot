import slack from '@slack/client';
import schedule from 'node-schedule';

import rtm from '../rtm';

import db from '../db';

import {mentionsUser, isIM} from '../message-utils';

import episodes from './episodes';
import otherResources from './other-resources';
import config from './config';

let channels;

const channelID = originalChannel => {
	if (originalChannel.charAt(0) === '#' || originalChannel.charAt(0) === '@') {
		return channels.filter(channel => {
			return channel.name === originalChannel.substring(1);
		})[0].id;
	}

	return originalChannel;
};

const getCurrentEpisodeIndex = callback => {
	db.get('currentEpisode', (err, reply) => {
		if (err) {
			console.log(err);
		}

		let episodeNumber = 1;

		if (reply) {
			episodeNumber = reply;
		} else {
			db.set('currentEpisode', episodeNumber);
		}

		return callback(episodeNumber - 1);
	});
};

const nextEpisode = callback => {
	db.incr('currentEpisode', callback);
};

const announceEpisode = (episodeIndex, options = {}) => {
	options = Object.assign(
		{
			channel: config.defaultChannel,
			force: false
		},
		options
	);

	if (episodeIndex < episodes.length) {
		const episode = episodes[episodeIndex];

		setTimeout(() => {
			rtm.sendMessage(
`Today's episode is *${episode.title}*!
:tv: Stream: ${episode.streamURL}
:rocket: Code: ${episode.sourceURL}`,
				channelID(options.channel)
			);
		}, 250);
	} else if (options.force) {
		const resource = otherResources[0];

		setTimeout(() => {
			rtm.sendMessage(
`We've completed the #JavaScript30 course :tada:
There are lots of other cool resources for learning JavaScript. Try ${resource}!`,
				channelID(options.channel)
			);
		}, 250);
	}
};

const announceCurrentEpisode = (options = {}) => {
	getCurrentEpisodeIndex(episodeIndex => {
		announceEpisode(episodeIndex, options);
	});
};

export default () => {
	rtm.on(slack.CLIENT_EVENTS.RTM.AUTHENTICATED, rtmStartData => {
		channels = rtmStartData.channels;

		schedule.scheduleJob(config.schedule, () => {
			nextEpisode(announceCurrentEpisode);
		});
	});

	rtm.on(slack.RTM_EVENTS.MESSAGE, message => {
		if (!message.text || message.user === rtm.activeUserId) {
			return;
		}

		if (
			(
				mentionsUser(message, rtm.activeUserId) ||
				isIM(message)
			) &&
			message.text.match(
				/(today'?s|current) (episode|ep\.?)/i
			)
		) {
			announceCurrentEpisode({channel: message.channel, force: true});
		}
	});
};
