const mongoose = require('mongoose');

const movieSchema = new mongoose.Schema(
    {
        imageURL: {
            type: String,
        },
        movieName: {
            type: String,
            trim: true,
        },
        movieDescription: {
            type: String,
            trim: true,
        },
        movieLink: {
            type: String,
        },
        movieType: {
            type: String,
        },
        price: {
            type: Number,
        },
    },
    {
        timestamps: true, // Automatically manage createdAt and updatedAt fields
    }
);

module.exports = mongoose.model('Movie', movieSchema);
