const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

/* ================= DB CONNECTION ================= */

mongoose.connect('mongodb://127.0.0.1:27017/busBooking')
.then(() => console.log('✅ MongoDB connected'))
.catch(err => console.error('❌ MongoDB error:', err));


/* ================= SCHEMA ================= */

const bookingSchema = new mongoose.Schema({
    bookingId: String,
    passengerName: String,
    passengerId: String,
    passengerContact: String,
    fromCounty: String,
    toCounty: String,
    travelDate: String,
    travelTime: String,
    numberOfSeats: Number,
    seatNumbers: [Number],
    busNumber: String,
    paymentMode: { type: String, default: 'Cash' },
    amountToPay: Number,
    createdAt: { type: Date, default: Date.now }
});

const Booking = mongoose.model('Booking', bookingSchema);


/* ================= HELPER FUNCTIONS ================= */

function generateBookingId(fromCounty, toCounty){

    const from = fromCounty.substring(0,3).toUpperCase();
    const to = toCounty.substring(0,3).toUpperCase();
    const random = Math.floor(10000 + Math.random()*90000);

    return `SR-${from}-${to}-${random}`;
}

/* realistic fare logic */

function calculateFare(fromCounty, toCounty, numberOfSeats){

    const baseFare = 500;

    const distanceFactor = Math.abs(fromCounty.length - toCounty.length) * 15;

    return (baseFare + distanceFactor) * numberOfSeats;
}


/* ================= ROUTES ================= */


/* CREATE BOOKING */

app.post('/book', async (req,res)=>{

try{

const data = req.body;

/* required fields */

const requiredFields = [
'passengerName',
'fromCounty',
'toCounty',
'travelDate',
'travelTime',
'busNumber',
'numberOfSeats',
'seatNumbers'
];

for(const field of requiredFields){

if(!data[field]){

return res.status(400).json({
message:`${field} is required`
});

}

}

/* convert seat numbers */

let seatArray = [];

if(Array.isArray(data.seatNumbers)){

seatArray = data.seatNumbers;

}else{

seatArray = data.seatNumbers
.toString()
.split(',')
.map(s => parseInt(s.trim()));

}


/* check if seats already booked */

const existingBookings = await Booking.find({
busNumber:data.busNumber,
travelDate:data.travelDate,
travelTime:data.travelTime
});

const takenSeats = existingBookings.flatMap(b=>b.seatNumbers);

const conflict = seatArray.find(seat => takenSeats.includes(seat));

if(conflict){

return res.status(400).json({
message:`Seat ${conflict} is already booked`
});

}


/* generate booking id */

const bookingId = generateBookingId(
data.fromCounty,
data.toCounty
);


/* calculate fare */

const amountToPay = calculateFare(
data.fromCounty,
data.toCounty,
data.numberOfSeats
);


/* create booking */

const newBooking = new Booking({

...data,
bookingId,
seatNumbers:seatArray,
amountToPay

});


await newBooking.save();


/* response sent to frontend */

res.status(201).json({

message:"Booking successful",

bookingId:bookingId,

passengerName:data.passengerName,
passengerContact:data.passengerContact,

fromCounty:data.fromCounty,
toCounty:data.toCounty,

travelDate:data.travelDate,
travelTime:data.travelTime,

numberOfSeats:data.numberOfSeats,
seatNumbers:seatArray,

busNumber:data.busNumber,
paymentMode:data.paymentMode || "Cash",

amountToPay:amountToPay

});

}catch(err){

console.error(err);

res.status(500).json({
message:"Server error"
});

}

});


/* GET ALL BOOKINGS */

app.get('/bookings', async(req,res)=>{

try{

const bookings = await Booking
.find()
.sort({createdAt:-1});

res.json(bookings);

}catch(err){

res.status(500).json({
message:"Server error"
});

}

});


/* GET TAKEN SEATS */

app.get('/bus-seats', async(req,res)=>{

try{

const {busNumber,travelDate,travelTime} = req.query;

if(!busNumber || !travelDate || !travelTime){

return res.status(400).json({
message:"Missing parameters"
});

}

const bookings = await Booking.find({
busNumber,
travelDate,
travelTime
});

const takenSeats = bookings.flatMap(b=>b.seatNumbers);

res.json({takenSeats});

}catch(err){

res.status(500).json({
message:"Server error"
});

}

});


/* DELETE BOOKING */

app.delete('/bookings/:id', async(req,res)=>{

try{

await Booking.findByIdAndDelete(req.params.id);

res.json({
message:"Booking deleted"
});

}catch(err){

res.status(500).json({
message:"Server error"
});

}

});


/* START SERVER */

const PORT = 5000;

app.listen(PORT, ()=>{

console.log(`🚀 SafariRide Server running on http://localhost:${PORT}`);

});