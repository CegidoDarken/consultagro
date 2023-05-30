const mongoose = require('mongoose');
const { boolean } = require('webidl-conversions');
const users = mongoose.Schema;
const videos = mongoose.Schema;
Tasks = {};
const TaskUsers = new users({
    username: String,
    email: String,
    password: String,
    date: Date,
});

const TaskVideos = new videos({
    idUser: videos.Types.ObjectId,
    title: String,
    description: String,
    capture: {
        typeCapture: String,
        data: Buffer
    },
    video: {
        typeVideo: String,
        data: Buffer
    },
    views: Number,
});
Tasks.taskUsers = mongoose.model('users', TaskUsers);
Tasks.taskVideos = mongoose.model('videos', TaskVideos);
module.exports = Tasks;