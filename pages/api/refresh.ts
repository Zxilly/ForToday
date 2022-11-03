import { NextApiRequest, NextApiResponse } from 'next';
import {fetchAll} from "../../tentacle";
import {client} from "../../constants";

export default async function handler(
    request: NextApiRequest,
    response: NextApiResponse,
) {
    const lock = await client.setnx("lock", "1");
    if (!lock) {
        response.status(200).json({message: "locked"});
        return;
    }
    await client.expire("lock", 60);
    const data = await fetchAll()
    await client.set("data", JSON.stringify(data))
    await client.del("lock")
    response.status(200).json({
        time: new Date().getTime(),
    });
}
