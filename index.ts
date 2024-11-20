import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";
import * as cookie from "cookie-es";
import core from "@actions/core";
import github from "@actions/github";

const slugRegex = /[-a-zA-Z0-9_]+/gm;
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

export const env = createEnv({
    server: {
        ZANE_USERNAME: z.string().min(1, "The zaneops username is required"),
        ZANE_PASSWORD: z.string().min(1, "The zaneops password is required"),
        ZANE_PROJECT_SLUG: z.string().regex(slugRegex, "Invalid slug"),
        ZANE_SERVICE_SLUG: z.string().regex(slugRegex, "Invalid slug"),
        SERVICE_IMAGE: z
            .string()
            .min(1, "The image of your service is required"),
        ZANE_DASHBOARD_BASE_URL: z
            .string()
            .url("Invalid URL for the dashboard base URL"),
        COMMIT_MESSAGE: z.string().optional(),
    },
    runtimeEnv: process.env,
    emptyStringAsUndefined: true,
});

const inputSchema = z.object({
    username: z.string().min(1, "The zaneops username is required"),
    password: z.string().min(1, "The zaneops password is required"),
    projectSlug: z.string().regex(slugRegex, "Invalid slug"),
    serviceSlug: z.string().regex(slugRegex, "Invalid slug"),
    serviceImage: z.string().min(1, "The image of your service is required"),
    commitMessage: z.string().url("Invalid URL for the dashboard base URL"),
    zaneDashboardBaseUrl: z.string().optional(),
});

type Input = z.infer<typeof inputSchema>;

async function parseResponseBody(response: Response) {
    return response.headers.get("content-type") === "application/json"
        ? await response.json()
        : await response.text();
}

async function deployScript() {
    try {
        const input: Record<keyof Input, any> = {
            username: core.getInput("username", {
                trimWhitespace: true,
            }),
            password: core.getInput("password", {
                trimWhitespace: true,
            }),
            projectSlug: core.getInput("project-slug", {
                trimWhitespace: true,
            }),
            serviceSlug: core.getInput("service-slug", {
                trimWhitespace: true,
            }),
            serviceImage: core.getInput("service-new-image", {
                trimWhitespace: true,
            }),
            commitMessage: core.getInput("commit-message", {
                trimWhitespace: true,
            }),
            zaneDashboardBaseUrl: core.getInput("base-url", {
                trimWhitespace: true,
            }),
        };
        const {
            username,
            password,
            projectSlug,
            serviceImage,
            serviceSlug,
            zaneDashboardBaseUrl,
            commitMessage = `auto-deploy from commit ${github.context.sha}`,
        } = inputSchema.parse(input);

        console.log(
            `Getting the CSRF token on ZaneOps API at ${colors.blue(
                zaneDashboardBaseUrl
            )}...`
        );
        const csrfResponse = await fetch(`${zaneDashboardBaseUrl}/api/csrf`);
        const csrfToken = cookie.parseSetCookie(
            csrfResponse.headers.get("set-cookie") ?? ""
        ).value;

        if (csrfResponse.status !== 200) {
            console.log(
                colors.red("❌ Failed to get CSRF token from ZaneOps API ❌")
            );
            console.log(
                `Received status code from zaneops API : ${colors.red(
                    csrfResponse.status
                )}`
            );

            console.log("Received response from zaneops API : ");
            console.dir(await parseResponseBody(csrfResponse));
            core.setFailed("Failure");
        } else {
            console.log(`Got the CSRF token successfully ✅`);
        }

        console.log(`Authenticating to ZaneOps API...`);
        const authResponse = await fetch(
            `${zaneDashboardBaseUrl}/api/auth/login`,
            {
                method: "POST",
                headers: {
                    "x-csrftoken": csrfToken,
                    cookie: `csrftoken=${csrfToken}`,
                    "content-type": "application/json",
                },
                body: JSON.stringify({ username, password }),
            }
        );

        if (authResponse.status !== 201) {
            console.log(
                colors.red("❌ Failed to authenticate to ZaneOps API ❌")
            );
            console.log(
                `Received status code from zaneops API : ${colors.red(
                    authResponse.status
                )}`
            );

            console.log("Received response from zaneops API : ");
            console.dir(await parseResponseBody(authResponse));
            core.setFailed("Failure");
        } else {
            console.log(`Successfully Authenticated to ZaneOps API ✅`);
        }

        const sessionIdCookieStr = cookie
            .splitSetCookieString(authResponse.headers.get("set-cookie") ?? "")
            .filter((cookieStr) => cookieStr.startsWith("sessionid"))[0];

        const sessionId = cookie.parseSetCookie(sessionIdCookieStr).value;

        const requestCookie = [
            cookie.serialize("sessionid", sessionId),
            cookie.serialize("csrftoken", csrfToken),
            "",
        ].join(";");

        console.log(
            `Updating the image for the service ${colors.orange(
                serviceSlug
            )} in the project ${colors.orange(projectSlug)}...`
        );
        const requestChangeResponse = await fetch(
            `${zaneDashboardBaseUrl}/api/projects/${projectSlug}/request-service-changes/docker/${serviceSlug}/`,
            {
                method: "put",
                headers: {
                    "x-csrftoken": csrfToken,
                    cookie: requestCookie,
                    "content-type": "application/json",
                },
                body: JSON.stringify({
                    type: "UPDATE",
                    new_value: serviceImage,
                    field: "image",
                }),
            }
        );

        if (requestChangeResponse.status !== 200) {
            console.log(
                colors.red(
                    "❌ Failed to update the image of the service on ZaneOps API ❌"
                )
            );
            console.log(
                `Received status code from zaneops API : ${colors.red(
                    requestChangeResponse.status
                )}`
            );

            console.log("Received response from zaneops API : ");
            console.dir(await parseResponseBody(requestChangeResponse));
            core.setFailed("Failure");
        } else {
            console.log(
                `Successfully Updated the image to ${colors.orange(
                    serviceImage
                )} ✅`
            );
        }

        console.log(
            `Queuing a new deployment for the service ${colors.orange(
                serviceSlug
            )}...`
        );
        const deploymentResponse = await fetch(
            `${zaneDashboardBaseUrl}/api/projects/${projectSlug}/deploy-service/docker/${serviceSlug}/`,
            {
                method: "put",
                headers: {
                    "x-csrftoken": csrfToken,
                    cookie: requestCookie,
                    "content-type": "application/json",
                },
                body: JSON.stringify({
                    commit_message: commitMessage,
                }),
            }
        );

        if (deploymentResponse.status === 200) {
            const deployment = await deploymentResponse.json();
            console.log(`Deployment queued succesfully ✅`);
            console.log(
                `inspect here ➡️ ${colors.blue(
                    `${zaneDashboardBaseUrl}/project/${projectSlug}/services/docker/${serviceSlug}/deployments/${deployment.hash}`
                )}`
            );
        } else {
            console.log(colors.red("❌ Failed to queue deployment ❌"));
            console.log(
                `Received status code from zaneops API : ${colors.red(
                    deploymentResponse.status
                )}`
            );

            const response =
                deploymentResponse.headers.get("content-type") ===
                "application/json"
                    ? await deploymentResponse.json()
                    : await deploymentResponse.text();
            console.log("Received response from zaneops API : ");
            console.dir(response);
            core.setFailed("Failure");
        }
    } catch (error) {
        core.setFailed((error as any).message);
    }
}

await deployScript();
