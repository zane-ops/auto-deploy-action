import { z, preprocess } from "zod";
import core from "@actions/core";
import github from "@actions/github";

const Colors = {
	GREEN: "\x1b[92m",
	BLUE: "\x1b[94m",
	ORANGE: "\x1b[38;5;208m",
	RED: "\x1b[91m",
	GREY: "\x1b[90m",
	ENDC: "\x1b[0m",
} as const;

const colors = {
	green: (input: any) => `${Colors.GREEN}${input}${Colors.ENDC}`,
	blue: (input: any) => `${Colors.BLUE}${input}${Colors.ENDC}`,
	orange: (input: any) => `${Colors.ORANGE}${input}${Colors.ENDC}`,
	red: (input: any) => `${Colors.RED}${input}${Colors.ENDC}`,
	grey: (input: any) => `${Colors.GREY}${input}${Colors.ENDC}`,
} as const;

const inputSchema = z.object({
	serviceImage: z.string().min(1, "The image of your service is required"),
	webhookUrl: z
		.string()
		.url("Invalid URL for the webhook URL"),
	commitMessage: z.string().optional(),
	extraHeaders: preprocess((arg: any) => {
		try {
			return JSON.parse(arg);
		} catch {
			return {};
		}
	}, z.record(z.string(), z.string()).optional().default({})),
});


try {
	const {
		serviceImage,
		webhookUrl,
		commitMessage = `auto-deploy from commit ${github.context.sha}`,
		extraHeaders,
	} = inputSchema.parse({
		serviceImage: process.env.SERVICE_IMAGE,
		commitMessage: process.env.COMMIT_MESSAGE,
		webhookUrl: process.env.DEPLOY_WEBHOOK_URL,
		extraHeaders: process.env.EXTRA_HEADERS,
	});


	console.log(
		`Deploying the service...`,
	);
	const deploymentResponse = await fetch(
		webhookUrl,
		{
			method: "PUT",
			headers: {
				"content-type": "application/json",
				...extraHeaders,
			},
			body: JSON.stringify({
				commit_message: commitMessage,
				new_image: serviceImage
			}),
		},
	);

	if (deploymentResponse.status === 200) {
		console.log(`Deployment queued succesfully ✅`);
		console.log(
			`inspect in your dashboard 🙂`,
		);
	} else {
		console.error(colors.red("❌ Failed to queue deployment ❌"));
		console.error(
			`Received status code from zaneops API : ${colors.red(
				deploymentResponse.status,
			)}`,
		);

		const response =
			deploymentResponse.headers.get("content-type") === "application/json"
				? await deploymentResponse.json()
				: await deploymentResponse.text();
		console.error("Received response from zaneops API : ");
		console.dir(response);
		core.setFailed("Failure");
	}
} catch (error) {
	core.setFailed((error as any).message);
}