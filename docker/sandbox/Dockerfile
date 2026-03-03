FROM debian:bookworm-slim

# Install security tools and utilities
RUN apt-get update && apt-get install -y --no-install-recommends \
    bash \
    curl \
    wget \
    ca-certificates \
    python3 \
    python3-pip \
    python3-venv \
    nmap \
    git \
    httpie \
    jq \
    dnsutils \
    iputils-ping \
    netcat-openbsd \
    whois \
    fping \
    hping3 \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Install Python security tools
RUN pip3 install --no-cache-dir --break-system-packages \
    sqlmap \
    xsstrike

# Create non-root user
RUN useradd -m -u 1000 -s /bin/bash sandbox

# Set working directory
WORKDIR /sandbox

# Create workspace directory with proper permissions
RUN mkdir -p /sandbox/workspace && \
    chown -R sandbox:sandbox /sandbox

# Switch to non-root user
USER sandbox

ENTRYPOINT ["/bin/bash"]
CMD ["-c", "sleep infinity"]
