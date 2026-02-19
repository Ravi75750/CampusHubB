import Filter from 'bad-words';
const filter = new Filter();

// Add custom bad words or remove if needed
// filter.addWords('somebadword'); 

const checkAbusiveLanguage = (text) => {
    if (!text) return false;
    return filter.isProfane(text);
};

const moderationMiddleware = (req, res, next) => {
    const { text, title, content } = req.body; // Check potential text fields

    if (text && checkAbusiveLanguage(text)) {
        return res.status(400).json({ message: "Content contains abusive language and cannot be posted." });
    }
    if (title && checkAbusiveLanguage(title)) {
        return res.status(400).json({ message: "Title contains abusive language and cannot be posted." });
    }
    if (content && checkAbusiveLanguage(content)) {
        return res.status(400).json({ message: "Content contains abusive language and cannot be posted." });
    }
    next();
};

export default moderationMiddleware;
