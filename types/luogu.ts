export interface LuoguToken {
	uid: string;
	client_id: string;
}

export interface LuoguSavedToken extends LuoguToken {
	timestamp: number;
}

export interface LuoguRPCRequest {
	uid: string;
	client_id: string;
	account: string;
}
