# Auto-deploy to zaneops 

This action prints "Hello World" or "Hello" + the name of a person to greet to the log.

## Inputs

### `username`

**Required** The username of the Dashboard where zaneops is installed

## Outputs

### `time`

The time we greeted you.

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