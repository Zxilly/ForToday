import { NextApiRequest, NextApiResponse } from "next";
import { client } from "../../constants";
import { getNewTimedLogger, readData } from "../../utils/utils";

export default async function handler(
    request: NextApiRequest,
    response: NextApiResponse
)
{
    const logger = getNewTimedLogger();
    if(request.method !== "GET")
    {
        response.status(405).json({ message: "Method Not Allowed" });
        return;
    }

    const data = await readData(logger);
    if(data)
    {
        logger("Data exists, returning...");
        response.status(200).json(JSON.parse(data));
        return;
    }
    else
    {
        logger("Data does not exist, aborting...");
        response.status(404).json({ message: "no data" });
        return;
    }
}
