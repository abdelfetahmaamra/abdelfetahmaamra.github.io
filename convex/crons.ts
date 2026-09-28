import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Pull parcel statuses from every connected carrier (delivered / returned move orders automatically).
crons.interval("sync carrier statuses", { minutes: 30 }, internal.dispatch.syncStatuses, {});

// Housekeeping: expired sessions and old rate-limit hits.
crons.daily("cleanup", { hourUTC: 3, minuteUTC: 17 }, internal.maintenance.cleanup, {});

export default crons;
