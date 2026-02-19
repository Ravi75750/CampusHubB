import User from '../models/User.js';
import Post from '../models/Post.js';
import Report from '../models/Report.js';
import Notification from '../models/Notification.js';

export async function reportContent(req, res) {
    try {
        const { type, id, reason, description } = req.body; // type: 'post' or 'user'
        const reporterId = req.user.id;

        const reporter = await User.findById(reporterId);
        if (!reporter) return res.status(404).json({ message: "Reporter not found" });

        // We assume students report within their own course context, or we just save the reporter's course
        // The prompt says "teacher will handle the reports according to their course"
        // So we should tag the report with the Student's course.
        const course = reporter.course;
        if (!course) {
            // Fallback or error? A student usually has a course. 
            // If reporter is a teacher reporting? (Edge case, but let's assume student)
        }

        const reportData = {
            reporter: reporterId,
            targetType: type === 'post' ? 'Post' : 'User',
            reason,
            description,
            course: course || 'General', // Fallback
            status: 'Pending'
        };

        if (type === 'post') {
            reportData.reportedPost = id;
            // Validate post exists?
        } else {
            reportData.reportedUser = id;
        }

        const newReport = await Report.create(reportData);

        // Legacy: Is user model keeping reportsReceived?
        // logic from previous File View of User.js showed: reportsReceived: [{ ... }]
        // We can keep it for quick reference or rely solely on Report model.
        // Let's keep the legacy push for now if it was there, but the User model I saw had it.
        // Actually, let's just use the new Report model as the primary source of truth for the Teacher Dashboard.

        // Also add to User/Post directly if needed? 
        // For now, Report model is sufficient for the Teacher Dashboard requirements.

        res.status(201).json({ message: "Report submitted successfully", report: newReport });
    } catch (err) {
        console.error("Report Error:", err);
        res.status(500).json({ message: "Failed to submit report" });
    }
}

export async function banUser(req, res) {
    try {
        const { userId, durationInDays } = req.body;

        const teacher = await User.findById(req.user.id);
        const student = await User.findById(userId);

        if (!student) return res.status(404).json({ message: "User not found" });

        // Check permissions
        if (teacher.role !== 'Teacher' && teacher.role !== 'Admin') {
            return res.status(403).json({ message: "Unauthorized to ban" });
        }

        if (student.role !== 'Student') {
            return res.status(400).json({ message: "Can only ban students" });
        }

        student.isBanned = true;
        if (durationInDays) {
            const today = new Date();
            today.setDate(today.getDate() + durationInDays);
            student.banExpiresAt = today;
        } else {
            student.banExpiresAt = null; // Permanent ban if no duration
        }

        await student.save();

        // Archive user's posts
        await Post.updateMany({ author: userId }, { isArchived: true });

        res.json({ message: `User ${student.name} has been banned.` });
    } catch (err) {
        console.error("Ban Error:", err);
        res.status(500).json({ message: "Failed to ban user" });
    }
}

export async function unbanUser(req, res) {
    try {
        const { userId } = req.body;

        const teacher = await User.findById(req.user.id);
        const student = await User.findById(userId);

        if (!student) return res.status(404).json({ message: "User not found" });

        if (teacher.role !== 'Teacher' && teacher.role !== 'Admin') {
            return res.status(403).json({ message: "Unauthorized to unban" });
        }

        student.isBanned = false;
        student.banExpiresAt = null;
        await student.save();

        // Restore user's posts
        await Post.updateMany({ author: userId }, { isArchived: false });

        res.json({ message: `User ${student.name} has been unbanned.` });
    } catch (err) {
        console.error("Unban Error:", err);
        res.status(500).json({ message: "Failed to unban user" });
    }
}

// NEW: Get Reports for Teacher
export async function getReports(req, res) {
    try {
        const teacherId = req.user.id;
        const teacher = await User.findById(teacherId);

        if (teacher.role !== 'Teacher') {
            return res.status(403).json({ message: "Access denied" });
        }

        const course = teacher.course;
        // Filter reports by this course
        const reports = await Report.find({ course })
            .populate('reporter', 'name email avatar')
            .populate('reportedPost')
            .populate('reportedUser', 'name email avatar')
            .sort({ createdAt: -1 });

        res.json(reports);
    } catch (err) {
        console.error("Get Reports Error:", err);
        res.status(500).json({ message: "Failed to fetch reports" });
    }
}

// NEW: Update Report Status (Solve/Reject)
export async function updateReportStatus(req, res) {
    try {
        const { id } = req.params;
        const { status } = req.body; // 'Solved' or 'Rejected'

        if (!['Solved', 'Rejected'].includes(status)) {
            return res.status(400).json({ message: "Invalid status" });
        }

        const report = await Report.findById(id);
        if (!report) return res.status(404).json({ message: "Report not found" });

        report.status = status;
        await report.save();

        // Notify user? currently just basic response, prompt implies notification:
        // "there should be a notification to the user who reported ... that your request ... has been (solved/rejected)"
        // I'll create a Notification object if the Notification model exists.

        if (Notification) {
            try {
                await Notification.create({
                    recipient: report.reporter,
                    sender: req.user.id, // Notification needs a sender. Usually system or the teacher/admin.
                    message: `Your report has been ${status.toLowerCase()}.`,
                    type: 'report_update',
                    isRead: false
                });
            } catch (notifyErr) {
                console.error("Failed to create notification:", notifyErr.message);
                // Don't fail the request if notification fails
            }
        }

        res.json({ message: `Report marked as ${status}`, report });
    } catch (err) {
        console.error("Update Report Error:", err);
        res.status(500).json({ message: "Failed to update report" });
    }
}
