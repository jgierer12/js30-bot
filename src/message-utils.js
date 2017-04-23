export const mentionsUser = (message, userId) => (
	message.text.includes(`<@${userId}>`)
);

export const isIM = message => (
	message.channel.charAt(0) === 'D'
);
