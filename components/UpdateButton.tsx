import React, { useEffect, useState } from "react";
import {
	AlertDialog,
	AlertDialogBody,
	AlertDialogContent,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogOverlay,
	Box,
	Button,
	IconButton,
	Tooltip,
	useDisclosure,
	useToast,
} from "@chakra-ui/react";
import { SpinnerIcon } from "@chakra-ui/icons";

export const UpdateButton: React.FC = () => {
	const [loading, setLoading] = useState(false);
	const toast = useToast();

	const { isOpen, onOpen, onClose } = useDisclosure();
	const cancelRef = React.useRef<any>();
	const bodyRef = React.useRef<any>();
	const [finished, setFinished] = useState(false);
	const [content, setContent] = useState("");

	useEffect(() => {
		if (isOpen) {
			setContent("");
			setFinished(false);
		}
	}, [isOpen]);

	return (
		<>
			<AlertDialog
				isOpen={isOpen}
				leastDestructiveRef={cancelRef}
				onClose={onClose}
				isCentered
				closeOnOverlayClick={finished}
				closeOnEsc={finished}
			>
				<AlertDialogOverlay>
					<AlertDialogContent>
						<AlertDialogHeader fontSize="lg" fontWeight="bold">
							{finished ? "爬取完成" : "正在爬取"}
						</AlertDialogHeader>
						<AlertDialogBody>
							<Box
								ref={bodyRef}
								height="50vh"
								style={{
									display: "block",
									whiteSpace: "pre-wrap",
									overflowY: "scroll",
								}}
								as="code"
								className="codeStyle"
							>
								{content}
							</Box>
						</AlertDialogBody>
						<AlertDialogFooter>
							<Button
								isDisabled={!finished}
								ref={cancelRef}
								onClick={onClose}
							>
								关闭
							</Button>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialogOverlay>
			</AlertDialog>
			<Tooltip label="重新爬取" placement="right">
				<IconButton
					aria-label={"update"}
					icon={<SpinnerIcon />}
					isLoading={loading}
					onClick={() => {
						onOpen();
						setLoading(true);

						const evtSource = new EventSource("/api/refresh");
						evtSource.addEventListener("finish", () => {
							evtSource.close();
							setFinished(true);
							setLoading(false);

							toast({
								title: "爬取完成",
								status: "success",
								duration: 2000,
								isClosable: false,
								position: "top",
							});
						});
						evtSource.onmessage = (e) => {
							setContent((content) => {
								if (content === "") {
									return e.data;
								} else {
									return content + "\n" + e.data;
								}
							});
							bodyRef.current.scrollTop =
								bodyRef.current.scrollHeight;
						};

						evtSource.onerror = () => {
							evtSource.close();
							setLoading(false);
							setFinished(true);
							toast({
								title: "爬取失败",
								status: "error",
								duration: 2000,
								isClosable: false,
								position: "top",
							});
						};
					}}
				/>
			</Tooltip>
		</>
	);
};
