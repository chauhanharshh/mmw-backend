import mongoose from 'mongoose';
import dotenv from 'dotenv';
import EnquiryPackage from '../models/EnquiryPackage.js';

dotenv.config();

const initialPackages = [
    // Tours
    { name: 'Char Dham Helicopter Yatra', category: 'tour' },
    { name: 'Do Dham Yatra', category: 'tour' },
    { name: 'Shree Khatu Shyam Yatra', category: 'tour' },
    { name: 'Chalo Series', category: 'tour' },

    // Chalo Series Destinations
    { name: 'Haridwar', category: 'chalo' },
    { name: 'Rishikesh', category: 'chalo' },
    { name: 'Kainchi Dham', category: 'chalo' },
    { name: 'Dhari Devi Maa', category: 'chalo' },
    { name: 'Ayodhya', category: 'chalo' },
    { name: 'Shree Khatu Shyam Ji', category: 'chalo' },
    { name: 'Nainital', category: 'chalo' },
    { name: 'Shimla', category: 'chalo' },
    { name: 'Manali', category: 'chalo' },
    { name: 'Udaipur', category: 'chalo' },
    { name: 'Jaisalmer', category: 'chalo' }
];

async function seed() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        for (const pkg of initialPackages) {
            await EnquiryPackage.findOneAndUpdate(
                { name: pkg.name },
                { $set: pkg },
                { upsert: true, new: true }
            );
        }

        console.log('Successfully seeded enquiry packages');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding packages:', error);
        process.exit(1);
    }
}

seed();
