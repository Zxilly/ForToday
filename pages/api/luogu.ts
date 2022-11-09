import { NextApiRequest, NextApiResponse } from "next";
import { client } from "../../constants";
import { getNewTimedLogger } from "../../utils/utils";
import { LuoguSavedToken, LuoguToken } from "../../types/luogu";
import { LuoguTentacle } from "../../tentacle/luogu";

export default async function handler(
    request: NextApiRequest,
    response: NextApiResponse
)
{
    const logger = getNewTimedLogger();
    if(request.method !== "POST")
    {
        response.status(405).json({ message: "Method Not Allowed" });
        return;
    }

    const { uid, client_id } = request.body as LuoguToken;
    if(!uid || !client_id)
    {
        response.status(400).json({ message: "Bad Request" });
        return;
    }
    logger(`uid: ${uid}, client_id: ${client_id}`);

    const impl = new LuoguTentacle();
    const result = await impl.check({ uid, client_id });
    if(!result)
    {
        response.status(403).json({ message: "Token Invalid" });
        return;
    }

    logger("Saving...");
    await client.set("luogu_token", JSON.stringify({
        uid,
        client_id,
        timestamp: new Date().getTime(),
    } as LuoguSavedToken));
    logger("Saved.");
    response.status(200).json({
        time: new Date().getTime(),
    });
}
