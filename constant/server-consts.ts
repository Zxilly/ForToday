import { Redis } from "@upstash/redis";

export const CODEFORCES_GROUP_ID = process.env.CODEFORCES_GROUP_ID;

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

if (!url || !token) {
	throw new Error(
		"UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be set",
	);
}

const redis = new Redis({
	url,
	token,
});

export const client = redis;

export const InvalidRequestError = Response.json(
	{
		message: "Invalid Request",
	},
	{
		status: 400,
	},
);

export const BaseURL =
	(process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`) ||
	"http://localhost:3000";
