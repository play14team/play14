docker build \
  --build-arg NODE_ENV=production \
  # --build-arg STRAPI_URL=https://api.example.com \ # Uncomment to set the Strapi Server URL
  -t play14/play14-api:latest \ # Replace with your image name
  -f Dockerfile.prod .
