const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const axios = require('axios');

dotenv.config();

const app = express();

// Middleware
app.use(cors({
    origin: '*', // Add allowed origins here
    credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => console.log('✅ MongoDB Connected'))
    .catch(err => {
        console.error('❌ MongoDB Connection Error:', err);
        process.exit(1);
    });

// Import the Movie model
const Movie = require('./models/Movie');
const CineKahaniAdmin = require('./models/CineKahaniAdmin');

// Routes
app.get('/api/ping', (req, res) => {
    res.status(200).send('Server is up and running');
});

// GET Movies - Fetch all movies for the Suggested movie section
app.get('/api/movies', async (req, res) => {
    try {
        const movies = await Movie.find({});
        res.status(200).json(movies);
    } catch (error) {
        console.error('Error fetching movies:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// POST Movie - Add a new movie for the Suggested-movie section
app.post('/api/movies', async (req, res) => {
    const { imageURL, movieName, movieDescription, movieLink, movieType, price } = req.body;

    // Validate that all required fields are provided
    if (!imageURL || !movieName || !movieDescription || !movieLink || !movieType) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    // If the movie is "Paid", price is also required
    if (movieType === 'Paid' && !price) {
        return res.status(400).json({ message: 'Price is required for Paid movies' });
    }

    try {
        // Create the new movie object with all fields
        const movie = new Movie({
            imageURL,
            movieName,
            movieDescription,
            movieLink,
            movieType,
            price: movieType === 'Paid' ? price : null, // Price is saved only if movie is Paid
        });

        // Save the movie to the database
        await movie.save();

        // Send a success response
        res.status(201).json({ message: 'Movie added successfully' });
    } catch (error) {
        console.error('Error saving movie:', error);
        res.status(500).json({ message: 'Server error' });
    }
});


app.delete('/api/movies/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const deletedMovie = await Movie.findByIdAndDelete(id);
        if (!deletedMovie) return res.status(404).json({ message: 'Movie not found' });

        res.status(200).json({ message: 'Movie deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});


app.get('/api/movies/:id', async (req, res) => {
    try {
        const movie = await Movie.findById(req.params.id);
        if (!movie) return res.status(404).json({ message: 'Movie not found' });
        res.status(200).json(movie);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});



app.put('/api/movies/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const movie = await Movie.findByIdAndUpdate(id, updates, { new: true });
        if (!movie) return res.status(404).json({ message: 'Movie not found' });
        res.status(200).json({ message: 'Movie updated successfully', movie });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});


// New route to fetch professions of workers
app.get('/api/search/movie', async (req, res) => {
    try {
        const movies = await Movie.aggregate([
            { $group: { _id: "$movieName" } },  // Group by the profession field
            { $project: { _id: 0, movieName: "$_id" } }, // Project the result to only include profession
        ]);

        const uniqueMovies = movies.map(prof => prof.movieName);
        res.status(200).json({ movies: uniqueMovies });
    } catch (error) {
        console.error('❌ Failed to fetch professions:', error);
        res.status(500).json({ message: 'Failed to retrieve professions.' });
    }
});


app.get('/api/movies', async (req, res) => {
    const { name } = req.query;
    try {
        if (name) {
            const movie = await Movie.findOne({ movieName: name });
            return res.status(200).json(movie);
        }
        const movies = await Movie.find();
        res.status(200).json(movies);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch movies.' });
    }
});


// Route to Update User Visits
app.post('/api/user-visited', async (req, res) => {
    try {
        let adminData = await CineKahaniAdmin.findOne();
        const totalMovies = await Movie.countDocuments();
        if (!adminData) {
            adminData = new CineKahaniAdmin(); // Create a new document if none exists
        }
        adminData.userVisited += 1; // Increment the userVisited count
        adminData.totalMovies = totalMovies;
        await adminData.save();

        res.status(200).json({
            message: 'User visit count updated successfully',
            userVisited: adminData.userVisited,
        });
    } catch (error) {
        console.error('Error updating user visit count:', error);
        res.status(500).json({ message: 'Failed to update user visit count' });
    }
});

// Route to Get User Visits
app.get('/api/user-visited', async (req, res) => {
    try {
        const adminData = await CineKahaniAdmin.findOne();
        if (!adminData) {
            return res.status(404).json({ message: 'No data found' });
        }
        res.status(200).json(adminData);
    } catch (error) {
        console.error('Error fetching user visit count:', error);
        res.status(500).json({ message: 'Failed to fetch user visit count' });
    }
});


app.get('/download', async (req, res) => {
    const { movieId } = req.query;

    if (!movieId) {
        return res.status(400).json({ error: 'Movie ID is required' });
    }

    const googleDriveUrl = `https://drive.google.com/uc?export=download&id=${movieId}`;

    try {
        const response = await axios.get(googleDriveUrl, { responseType: 'stream' });

        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${movieId}.mp4"`);
        response.data.pipe(res);
    } catch (error) {
        console.error('Error fetching file from Google Drive:', error.message);
        res.status(500).json({ error: 'Failed to fetch the movie file.' });
    }
});



// Route to fetch movie details by ID
app.get('/movie-details', async (req, res) => {
    const { movieId } = req.query;

    if (!movieId) {
        return res.status(400).json({ message: 'Movie ID is required' });
    }

    try {
        // Find the movie by its ID
        const movie = await Movie.findById(movieId);
        if (!movie) {
            return res.status(404).json({ message: 'Movie not found' });
        }

        // Send the movie's image and name
        res.status(200).json(movie);
    } catch (error) {
        console.error('Error fetching movie details:', error);
        res.status(500).json({ message: 'Server error' });
    }
});



// Start the Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
