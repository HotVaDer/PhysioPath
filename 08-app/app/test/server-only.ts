// Stands in for the "server-only" package in tests (Next.js provides the real one when it builds; in a
// browser bundle it stops the build). Tests run in Node, where a server-only file is allowed anyway.
export {};
