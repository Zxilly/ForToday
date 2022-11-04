import {NextApiRequest, NextApiResponse} from 'next';
import {fetchAll} from "../../tentacle";
import {client} from "../../constants";
import {getNewTimedLogger} from "../../utils/utils";

export default async function handler(
    request: NextApiRequest,
    response: NextApiResponse,
) {
    const logger = getNewTimedLogger()
    logger("Adding lock...");
    const lock = await client.setnx("lock", "1");
    if (!lock) {
        response.status(200).json({message: "locked"});
        return;
    }
    await client.expire("lock", 15);
    logger("Lock added.");

    logger("Fetching...")
    const data = await fetchAll(logger)
    logger("Fetched.")
    logger("Saving...")
    await client.set("data", JSON.stringify(data))
    logger("Saved.")
    logger("Removing lock...")
    await client.del("lock")
    logger("Lock removed.")
    response.status(200).json({
        time: new Date().getTime(),
    });
}
