import React, { useCallback, useState } from "react";
import {
	AlertDialog,
	AlertDialogBody,
	AlertDialogCloseButton,
	AlertDialogContent,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogOverlay,
	Button,
	Input,
	useDisclosure,
	useToast,
} from "@chakra-ui/react";
import { useKey } from "react-use";
import { LuoguToken } from "../types/luogu";

const LuoguTokenDialog: React.FC = () => {
	const { isOpen, onOpen, onClose } = useDisclosure();
	const cancelRef = React.useRef<any>(null);
	const [uid, setUid] = useState("");
	const [clientID, setClientID] = useState("");
	const [loading, setLoading] = useState(false);

	useKey("q", (e) => {
		console.log(e);
		e.preventDefault();
		if (e.ctrlKey) {
			if (!isOpen) {
				onOpen();
			}
		}
	});

	const toast = useToast();

	const send = useCallback(async () => {
		if (loading) return;
		if (!uid || !clientID) {
			toast({
				title: "请填写完整",
				status: "error",
				duration: 2000,
				isClosable: false,
				position: "top",
			});
			return;
		}

		setLoading(true);
		const resp = await fetch("/api/luogu", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				uid,
				client_id: clientID,
			} as LuoguToken),
		});
		if (resp.status === 200) {
			toast({
				title: "绑定成功",
				status: "success",
				duration: 2000,
				isClosable: true,
				position: "top",
			});
			onClose();
		} else if (resp.status === 403) {
			toast({
				title: "Cookie 无效",
				description: "请检查 Uid 和 Client ID 是否正确",
				status: "error",
				duration: 2000,
				isClosable: true,
				position: "top",
			});
		}
		setLoading(false);
	}, [clientID, loading, onClose, toast, uid]);

	return (
		<>
			<AlertDialog
				leastDestructiveRef={cancelRef}
				isOpen={isOpen}
				onClose={onClose}
				autoFocus
				closeOnEsc
				closeOnOverlayClick={false}
				isCentered
			>
				<AlertDialogOverlay>
					<AlertDialogContent>
						<AlertDialogHeader>洛谷 Token</AlertDialogHeader>
						<AlertDialogCloseButton />
						<AlertDialogBody>
							<p>请在下方输入您的洛谷 cookie，以便于爬取数据。</p>
							<Input
								mt={2}
								placeholder="_uid"
								onChange={(e) => setUid(e.target.value)}
							/>
							<Input
								mt={2}
								placeholder="__client_id"
								onChange={(e) => setClientID(e.target.value)}
							/>
						</AlertDialogBody>
						<AlertDialogFooter>
							<Button
								ref={cancelRef}
								onClick={send}
								isLoading={loading}
							>
								保存
							</Button>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialogOverlay>
			</AlertDialog>
		</>
	);
};
export default LuoguTokenDialog;
