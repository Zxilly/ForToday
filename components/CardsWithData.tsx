import { getNewTimedLogger, readData } from "../utils/utils";
import { client } from "../constants";
import React from "react";
import Cards from "./Cards";
import 'server-only';

export default async function CardsWithData() {
  const logger = getNewTimedLogger();
  const data = await readData(client, logger);
  if (!data) {
    return <Cards  initialData={{}} />;
  } else {
    return <Cards initialData={JSON.parse(data)} />;
  }
}