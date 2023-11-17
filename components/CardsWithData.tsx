import { getNewTimedLogger } from "../utils/utils";
import React from "react";
import Cards from "./Cards";
import 'server-only';
import { readData } from "../utils/repo";

export default async function CardsWithData() {
  const logger = getNewTimedLogger();
  const data = await readData(logger);
  if (!data) {
    return <Cards  initialData={{}} />;
  } else {
    return <Cards initialData={data} />;
  }
}