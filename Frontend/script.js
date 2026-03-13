const seatContainer = document.getElementById("busSeats");
const seatCountInput = document.getElementById("seatCount");
const fareDisplay = document.getElementById("fareAmount");
const ticket = document.getElementById("ticket");

// DOM elements
const nameInput = document.getElementById("name");
const idInput = document.getElementById("idNumber");
const contactInput = document.getElementById("contact");
const fromCountyInput = document.getElementById("fromCounty");
const toCountyInput = document.getElementById("toCounty");
const travelDateInput = document.getElementById("travelDate");
const travelTimeInput = document.getElementById("travelTime");
const busSelectInput = document.getElementById("busSelect");
const paymentModeInput = document.getElementById("paymentMode");

let selectedSeats = [];

// Generate 72 seats
for (let i = 1; i <= 72; i++) {
    const seat = document.createElement("div");
    seat.classList.add("seat");
    seat.innerText = i;

    seat.onclick = () => {
        if (seat.classList.contains("booked")) return;

        if (seat.classList.contains("selected")) {
            seat.classList.remove("selected");
            selectedSeats = selectedSeats.filter(s => s !== i);
        } else {
            if (selectedSeats.length >= Number(seatCountInput.value)) {
                alert("Seat limit reached");
                return;
            }
            seat.classList.add("selected");
            selectedSeats.push(i);
        }
        updateTicket();
    };

    seatContainer.appendChild(seat);
}

// Fetch already booked seats
async function fetchBookedSeats() {
    const bus = busSelectInput.value;
    const date = travelDateInput.value;
    const time = travelTimeInput.value;

    // Reset seats
    document.querySelectorAll(".seat").forEach(s => {
        s.classList.remove("booked");
        s.classList.remove("selected");
    });
    selectedSeats = [];

    if (!bus || !date || !time) return;

    try {
        const res = await fetch(`http://localhost:5000/bus-seats?busNumber=${bus}&travelDate=${date}&travelTime=${time}`);
        const data = await res.json();
        if (data.takenSeats && data.takenSeats.length > 0) {
            data.takenSeats.forEach(num => {
                const seatEl = Array.from(seatContainer.children).find(s => Number(s.innerText) === num);
                if (seatEl) seatEl.classList.add("booked");
            });
        }
    } catch (err) {
        console.error("Error fetching booked seats:", err);
    }
}

// Fare calculation
function calculateFare() {
    const from = fromCountyInput.value;
    const to = toCountyInput.value;
    const seats = Number(seatCountInput.value);
    if (!from || !to || seats === 0) return 0;

    let base = 800;
    if (from === "Nairobi" && to === "Nakuru") base = 500;
    if (from === "Nairobi" && to === "Mombasa") base = 2000;
    if (from === "Nairobi" && to === "Kisumu") base = 1500;

    const total = base * seats;
    fareDisplay.innerText = "KES " + total;
    return total;
}

// Update ticket preview
function updateTicket() {
    const total = calculateFare();

    ticket.innerHTML = `
<b>Name:</b> ${nameInput.value}<br>
<b>ID:</b> ${idInput.value}<br>
<b>Contact:</b> ${contactInput.value}<br>

<b>Route:</b> ${fromCountyInput.value} ➜ ${toCountyInput.value}<br>

<b>Date:</b> ${travelDateInput.value}<br>
<b>Time:</b> ${travelTimeInput.value}<br>

<b>Bus:</b> ${busSelectInput.value}<br>

<b>Seats:</b> ${selectedSeats.join(", ")}<br>

<b>Payment:</b> ${paymentModeInput.value}<br>

<b>Total:</b> KES ${total}
`;
}

// Update ticket and booked seats on change
document.querySelectorAll("input, select").forEach(el => {
    el.addEventListener("change", () => {
        updateTicket();
        fetchBookedSeats();
    });
});

// Submit booking
document.getElementById("bookingForm").addEventListener("submit", async e => {
    e.preventDefault();

    if (!nameInput.value || !idInput.value || !contactInput.value || !fromCountyInput.value || !toCountyInput.value) {
        alert("Please fill in all required fields.");
        return;
    }

    if (selectedSeats.length === 0) {
        alert("Please select seats");
        return;
    }

    const data = {
        passengerName: nameInput.value,
        passengerId: idInput.value,
        passengerContact: contactInput.value,
        fromCounty: fromCountyInput.value,
        toCounty: toCountyInput.value,
        travelDate: travelDateInput.value,
        travelTime: travelTimeInput.value,
        busNumber: busSelectInput.value,
        numberOfSeats: Number(seatCountInput.value),
        seatNumbers: selectedSeats,
        paymentMode: paymentModeInput.value,
        amountToPay: calculateFare()
    };

    try {
        const res = await fetch("http://localhost:5000/book", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });

        const result = await res.json();

        if (res.ok) {
            alert("Booking successful! Booking Reference: " + result.bookingId);
            fetchBookedSeats(); // refresh booked seats
            selectedSeats = [];
            updateTicket();
        } else {
            alert(result.message || "Booking failed");
        }
    } catch (err) {
        console.error(err);
        alert("Error connecting to server");
    }
});