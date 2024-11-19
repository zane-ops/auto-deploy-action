import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

const slugRegex = /[-a-zA-Z0-9_]+/gm;

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

/**
 * Get the value of a cookie with the given name.
 * @example
 *      getCookie('name');
 *      // => "value"
 * @param name
 * @returns
 */
export function getCookie(name: string, cookie: string): string | null {
    const value = `; ${cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
        return parts.pop()?.split(";").shift() ?? null;
    }
    return null;
}

async function deployScript() {
    const username = env.ZANE_USERNAME;
    const password = env.ZANE_PASSWORD;
    const projectSlug = env.ZANE_PROJECT_SLUG;
    const serviceSlug = env.ZANE_SERVICE_SLUG;
    const serviceImage = env.SERVICE_IMAGE;
    const commitMessage =
        env.COMMIT_MESSAGE ??
        `auto-deploy from commit ${process.env.COMMIT_SHA}`;
    const zaneDashboardBaseUrl = env.ZANE_DASHBOARD_BASE_URL;

    const csrfRes = await fetch(`${zaneDashboardBaseUrl}/api/csrf`);
    const csrfToken = getCookie(
        "csrftoken",
        csrfRes.headers.get("set-cookie")!
    )!;

    const res = await fetch(`${zaneDashboardBaseUrl}/api/auth/login`, {
        method: "POST",
        headers: {
            "x-csrftoken": csrfToken,
            cookie: `csrftoken=${csrfToken}`,
            "content-type": "application/json",
        },
        body: JSON.stringify({ username, password }),
    });

    const sessionCookie = res.headers
        .get("set-cookie")
        ?.split(";")[5]!
        .split(", ")[1]!;

    const serviceState = await fetch(
        `${zaneDashboardBaseUrl}/api/projects/${projectSlug}/request-service-changes/docker/${serviceSlug}/`,
        {
            method: "put",
            headers: {
                "x-csrftoken": csrfToken,
                cookie: `csrftoken=${csrfToken};${sessionCookie}`,
                "content-type": "application/json",
            },
            body: JSON.stringify({
                type: "UPDATE",
                new_value: serviceImage,
                field: "image",
            }),
        }
    ).then((res) => res.json());

    console.log({ serviceState });

    const deployment = await fetch(
        `${zaneDashboardBaseUrl}/api/projects/${projectSlug}/deploy-service/docker/${serviceSlug}/`,
        {
            method: "put",
            headers: {
                "x-csrftoken": csrfToken,
                cookie: `csrftoken=${csrfToken};${sessionCookie}`,
                "content-type": "application/json",
            },
            body: JSON.stringify({
                commit_message: commitMessage,
            }),
        }
    ).then((res) => res.json());

    console.dir(
        {
            deployment,
        },
        { depth: null }
    );
}

deployScript();
