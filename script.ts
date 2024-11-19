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
    const username = process.env.ZANE_USERNAME;
    const password = process.env.ZANE_PASSWORD;
    const zane_domain = process.env.ZANE_DOMAIN;

    const csrfRes = await fetch("https://${zane_domain}/api/csrf");
    const csrfToken = getCookie(
        "csrftoken",
        csrfRes.headers.get("set-cookie")!
    )!;

    const res = await fetch("https://${zane_domain}/api/auth/login", {
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
        `https://${zane_domain}/api/projects/lazrak-chatbot/request-service-changes/docker/api/`,
        {
            method: "put",
            headers: {
                "x-csrftoken": csrfToken,
                cookie: `csrftoken=${csrfToken};${sessionCookie}`,
                "content-type": "application/json",
            },
            body: JSON.stringify({
                type: "UPDATE",
                new_value: `ghcr.io/mo-cherif/lazrak-chatbot-api:${process.env.COMMIT_SHA}`,
                field: "image",
            }),
        }
    ).then((res) => res.json());

    console.log({ serviceState });

    const deployment = await fetch(
        `https://${zane_domain}/api/projects/lazrak-chatbot/deploy-service/docker/api/`,
        {
            method: "put",
            headers: {
                "x-csrftoken": csrfToken,
                cookie: `csrftoken=${csrfToken};${sessionCookie}`,
                "content-type": "application/json",
            },
            body: JSON.stringify({
                commit_message: `auto-deploy from commit ${process.env.COMMIT_SHA}`,
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
