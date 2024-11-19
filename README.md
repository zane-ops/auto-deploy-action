# Auto-deploy to zaneops 

This action prints "Hello World" or "Hello" + the name of a person to greet to the log.

## Inputs

### `who-to-greet`

**Required** The name of the person to greet. Default `"World"`.

## Outputs

### `time`

The time we greeted you.

## Example usage

```yaml
build-push-backend:
name: Build and Push your image
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
        context: ./backend
        file: ./backend/Dockerfile.prod
        push: true
        platforms: linux/amd64,linux/arm64
        tags: ghcr.io/zane-ops/backend:pr-${{ github.event.pull_request.number }},ghcr.io/zane-ops/backend:${{ github.sha }}
        cache-from: |
        type=registry,ref=ghcr.io/zane-ops/backend:pr-${{ github.event.pull_request.number }}
        type=registry,ref=ghcr.io/zane-ops/backend:canary
        cache-to: type=inline
uses: actions/hello-world-javascript-action@v1
with:
  who-to-greet: 'Mona the Octocat'
```
