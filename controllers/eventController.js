import Event from '../models/Event.js';

export async function createEvent(req, res) {
    try {
        const { title, date, time, location, category, image } = req.body;
        const newEvent = new Event({
            title, date, time, location, category, image,
            createdBy: req.user.id
        });
        await newEvent.save();
        res.status(201).json(newEvent);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

export async function getEvents(req, res) {
    try {
        const events = await Event.find().sort({ createdAt: -1 });
        res.status(200).json(events);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

export async function deleteEvent(req, res) {
    try {
        await Event.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: "Event deleted" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}
