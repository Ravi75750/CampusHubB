import Post from '../models/Post.js';
import Notification from '../models/Notification.js';

export async function createPost(req, res) {
    try {
        const { text } = req.body;
        let image = req.body.image; // Keep if user sends URL manually

        if (req.file) {
            image = req.file.path; // Cloudinary URL
        }

        const newPost = new Post({
            text,
            content: text,
            image,
            author: req.user.id
        });

        const savedPost = await newPost.save();
        await savedPost.populate('author', 'name username avatar role');
        res.status(201).json(savedPost);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

export async function deletePost(req, res) {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: "Post not found" });

        // Check ownership
        if (post.author.toString() !== req.user.id && req.user.role !== 'Admin') {
            return res.status(401).json({ message: "User not authorized" });
        }

        await post.deleteOne();
        res.status(200).json({ message: "Post deleted" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

export async function editPost(req, res) {
    try {
        const { text } = req.body;
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: "Post not found" });

        if (post.author.toString() !== req.user.id) {
            return res.status(401).json({ message: "User not authorized" });
        }

        post.text = text || post.text;
        post.content = text || post.content;

        await post.save();
        res.status(200).json(post);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

export async function getPosts(req, res) {
    try {
        const posts = await Post.find({ isArchived: { $ne: true } })
            .populate('author', 'name username avatar role')
            .populate('comments.author', 'name username avatar role')
            .populate('comments.replies.author', 'name username avatar role')
            .sort({ createdAt: -1 });

        // Hybrid Feed Logic:
        // Keep the top 3 latest posts at the top to ensure "new posted posts" are seen.
        // Shuffle the rest of the posts to give a "refreshed/changed" feel.

        const latestPosts = posts.slice(0, 3);
        const olderPosts = posts.slice(3);

        // Fisher-Yates Shuffle for older posts
        for (let i = olderPosts.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [olderPosts[i], olderPosts[j]] = [olderPosts[j], olderPosts[i]];
        }

        const hybridFeed = [...latestPosts, ...olderPosts];

        res.set('Cache-Control', 'no-store'); // Prevent browser caching
        res.status(200).json(hybridFeed);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

export async function addComment(req, res) {
    try {
        const { text } = req.body;
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: "Post not found" });

        post.comments.push({
            text,
            author: req.user.id
        });

        await post.save();

        const updatedPost = await Post.findById(req.params.id)
            .populate('author', 'name username avatar role')
            .populate('comments.author', 'name username avatar role')
            .populate('comments.replies.author', 'name username avatar role');

        res.status(201).json(updatedPost);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

export async function likePost(req, res) {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: "Post not found" });

        if (post.likes.includes(req.user.id)) {
            // Unlike
            post.likes = post.likes.filter(id => id.toString() !== req.user.id);
        } else {
            // Like
            post.likes.push(req.user.id);

            // Notification
            if (post.author.toString() !== req.user.id) {
                const notif = new Notification({
                    recipient: post.author,
                    sender: req.user.id,
                    type: 'like',
                    post: post._id
                });
                await notif.save();
            }
        }

        await post.save();
        res.status(200).json(post);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

export async function replyToComment(req, res) {
    try {
        const { text } = req.body;
        const { id, commentId } = req.params;

        const post = await Post.findById(id);
        if (!post) return res.status(404).json({ message: "Post not found" });

        const comment = post.comments.id(commentId);
        if (!comment) return res.status(404).json({ message: "Comment not found" });

        comment.replies.push({
            text,
            author: req.user.id
        });

        await post.save();

        const updatedPost = await Post.findById(id)
            .populate('author', 'name username avatar role')
            .populate('comments.author', 'name username avatar role')
            .populate('comments.replies.author', 'name username avatar role');

        res.status(201).json(updatedPost);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

export async function getPostsByUser(req, res) {
    try {
        const posts = await Post.find({ author: req.params.userId })
            .populate('author', 'name username avatar role')
            .populate('comments.author', 'name username avatar role')
            .populate('comments.replies.author', 'name username avatar role')
            .sort({ createdAt: -1 });
        res.status(200).json(posts);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}


export async function getPostCountByUser(req, res) {
    try {
        const count = await Post.countDocuments({ author: req.params.userId });
        res.status(200).json({ count });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

export async function getPostById(req, res) {
    try {
        const post = await Post.findById(req.params.id)
            .populate('author', 'name username avatar role')
            .populate('comments.author', 'name username avatar role')
            .populate('comments.replies.author', 'name username avatar role');
        if (!post) return res.status(404).json({ message: "Post not found" });
        res.status(200).json(post);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

export async function deleteComment(req, res) {
    try {
        const { id, commentId } = req.params;
        const post = await Post.findById(id);
        if (!post) return res.status(404).json({ message: "Post not found" });

        const comment = post.comments.id(commentId);
        if (!comment) return res.status(404).json({ message: "Comment not found" });

        // Check ownership or Admin role
        if (comment.author.toString() !== req.user.id && req.user.role !== 'Admin') {
            return res.status(401).json({ message: "User not authorized" });
        }

        comment.deleteOne();
        await post.save();

        const updatedPost = await Post.findById(id)
            .populate('author', 'name username avatar role')
            .populate('comments.author', 'name username avatar role')
            .populate('comments.replies.author', 'name username avatar role');

        res.status(200).json(updatedPost);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

export async function deleteReply(req, res) {
    try {
        const { id, commentId, replyId } = req.params;
        const post = await Post.findById(id);
        if (!post) return res.status(404).json({ message: "Post not found" });

        const comment = post.comments.id(commentId);
        if (!comment) return res.status(404).json({ message: "Comment not found" });

        const reply = comment.replies.id(replyId);
        if (!reply) return res.status(404).json({ message: "Reply not found" });

        // Check ownership or Admin role
        if (reply.author.toString() !== req.user.id && req.user.role !== 'Admin') {
            return res.status(401).json({ message: "User not authorized" });
        }

        reply.deleteOne();
        await post.save();

        const updatedPost = await Post.findById(id)
            .populate('author', 'name username avatar role')
            .populate('comments.author', 'name username avatar role')
            .populate('comments.replies.author', 'name username avatar role');

        res.status(200).json(updatedPost);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}
