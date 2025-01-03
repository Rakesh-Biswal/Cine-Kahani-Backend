const mongoose = require('mongoose');

const cineKahaniAdminSchema = new mongoose.Schema({
    userVisited: { type: Number, default: 0 },
    paidMovie: { type: Number, default: 0 },
    freeMovie: { type: Number, default: 0 },
    totalMovies: { type: Number, default: 0 },
});

module.exports = mongoose.model('CineKahaniAdmin', cineKahaniAdminSchema);