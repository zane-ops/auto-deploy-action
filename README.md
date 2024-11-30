# Auto-deploy to zaneops 

This action is used to deploy docker services automatically to a ZaneOps instance on git push.

## Example usage

```yaml
uses: zane-ops/auto-deploy-action@v1
with:
  username: ${{ secrets.ZANE_USERNAME }}
  password: ${{ secrets.ZANE_PASSWORD }}
  project-slug: my-project
  service-slug: my-service-app
  service-new-image: ghcr.io/fredkiss3:fredkiss-dev:${{ github.sha }}
  base-url: ${{ secrets.ZANE_DASHBOARD_URL }}
  commit-message: ${{ github.event.head_commit.message }}
```

This action is better used with the [`docker/build-push-action`](https://github.com/docker/build-push-action) action to build a version of your image based on the commit sha. A more real-life github action workflow would look like this : 

```yaml
name: ci

on:
  push:

jobs:
    build-push-app:
        name: Build and Push zaneops docs
        runs-on: ubuntu-latest
        permissions:
            packages: write
            contents: read
            attestations: write
            id-token: write
        steps:
            - name: Checkout
              uses: actions/checkout@v4
            - name: Set up QEMU
              uses: docker/setup-qemu-action@v2
            - name: Set up Docker Buildx
              uses: docker/setup-buildx-action@v2
            - name: Log in to the Container registry
              uses: docker/login-action@65b78e6e13532edd9afa3aa52ac7964289d1a9c1
                with:
                    registry: ghcr.io
                    username: ${{ github.actor }}
                    password: ${{ secrets.CONTAINER_REGISTRY_PAT }}
            - name: Build and push
              uses: docker/build-push-action@v3
              with:
                context: ./
                file: ./
                push: true
                platforms: linux/amd64,linux/arm64
                tags: ghcr.io/zane-ops/docs:latest,ghcr.io/zane-ops/docs:${{ github.sha }}
                cache-from: type=registry,ref=ghcr.io/zane-ops/docs:latest
                cache-to: type=inline
            - name: Deploy to Zaneops
              uses: zane-ops/auto-deploy-action@v1
              with:
                username: ${{ secrets.ZANE_USERNAME }}
                password: ${{ secrets.ZANE_PASSWORD }}
                project-slug: my-project
                service-slug: my-service-app
                service-new-image: ghcr.io/zane-ops/docs:${{ github.sha }}
                base-url: ${{ secrets.ZANE_DASHBOARD_URL }}
                commit-message: ${{ github.event.head_commit.message }}
```

## Inputs

### `username`

**Required** The username of the Dashboard where zaneops is installed

### `password`

**Required** The password for username in the Dashboard

### `project-slug`

**Required** The slug of the project that contains the service to be deployed.

### `service-slug`

**Required** The slug of the service to deploy

### `service-new-image`

**Required** The new version of the image to deploy, it's recommended to use the image with the commit sha as the tag, but you can also pass the same image as the one you specified when you created the service. it won't complain.

### `base-url`

**Required** The url of the dashboard of ZaneOps, should be formatted as `https://<your-dashboard-domain>`, ex: https://admin.zaneops.dev.

### `commit-message`
 
An optional custom commit message associated with the new deployment that will be created.

### `extra-headers`
 
Optional extra headers to pass to all the requests encoded as JSON. ex: `{"Authorizaton": "Bearer ey2f4o3nl94k"}`.