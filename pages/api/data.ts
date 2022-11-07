import { NextApiRequest, NextApiResponse } from "next";
import { client } from "../../constants";
import { getNewTimedLogger } from "../../utils/utils";

export default async function handler(
    request: NextApiRequest,
    response: NextApiResponse
)
{
    const logger = getNewTimedLogger();
    const data = await client.get("data");
    if(data){
        logger("Data exists, returning...");
        response.status(200).json(JSON.parse(data));
        return;
    } else {
        logger("Data does not exist, aborting...");
        response.status(404).json({ message: "no data" });
        return;
    }
}
