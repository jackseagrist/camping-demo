#!/bin/bash

# fetchAvailability Lambda Deployment Script
# This script automates the deployment of the async Lambda functions

set -e  # Exit on any error

echo "🚀 Starting fetchAvailability Lambda Deployment"
echo "================================================"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running on Windows (Git Bash/WSL)
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
    print_status "Detected Windows environment"
    WINDOWS=true
else
    WINDOWS=false
fi

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
print_status "Checking prerequisites..."

# Check Node.js
if ! command_exists node; then
    print_error "Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

NODE_VERSION=$(node --version | cut -d'.' -f1 | sed 's/v//')
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js version 18+ is required. Found: $(node --version)"
    exit 1
fi
print_success "Node.js $(node --version) ✓"

# Check npm
if ! command_exists npm; then
    print_error "npm is not installed."
    exit 1
fi
print_success "npm $(npm --version) ✓"

# Check Serverless Framework
if ! command_exists serverless; then
    print_warning "Serverless Framework not found. Installing globally..."
    npm install -g serverless
    if [ $? -ne 0 ]; then
        print_error "Failed to install Serverless Framework"
        exit 1
    fi
fi
print_success "Serverless Framework $(serverless --version | grep 'Framework Core' | awk '{print $3}') ✓"

# Check AWS CLI
if ! command_exists aws; then
    print_warning "AWS CLI not found. Please configure AWS credentials manually."
else
    print_success "AWS CLI $(aws --version | awk '{print $1}') ✓"
    
    # Check AWS credentials
    if ! aws sts get-caller-identity >/dev/null 2>&1; then
        print_warning "AWS credentials not configured or invalid"
        print_status "Please run 'aws configure' to set up your credentials"
    else
        AWS_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
        AWS_REGION=$(aws configure get region)
        print_success "AWS credentials configured (Account: $AWS_ACCOUNT, Region: $AWS_REGION) ✓"
    fi
fi

# Check environment variables
print_status "Checking environment variables..."

ENV_FILE=".env"
if [ ! -f "$ENV_FILE" ]; then
    print_warning ".env file not found. Creating template..."
    cat > "$ENV_FILE" << EOF
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-anon-key

# Security Token for HTTP triggers
CRON_TOKEN=your-secure-random-token-here

# AWS Configuration (optional if using AWS CLI profiles)
# AWS_ACCESS_KEY_ID=your-aws-access-key
# AWS_SECRET_ACCESS_KEY=your-aws-secret-key
# AWS_REGION=us-west-2
EOF
    print_warning "Please edit $ENV_FILE with your actual configuration values"
    print_error "Deployment cannot continue without proper environment configuration"
    exit 1
fi

# Load environment variables
if [ -f "$ENV_FILE" ]; then
    export $(cat "$ENV_FILE" | grep -v '^#' | xargs)
fi

# Validate required environment variables
REQUIRED_VARS=("SUPABASE_URL" "SUPABASE_KEY" "CRON_TOKEN")
MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ] || [ "${!var}" = "your-project.supabase.co" ] || [ "${!var}" = "your-supabase-anon-key" ] || [ "${!var}" = "your-secure-random-token-here" ]; then
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -ne 0 ]; then
    print_error "Missing or invalid environment variables:"
    for var in "${MISSING_VARS[@]}"; do
        print_error "  - $var"
    done
    print_error "Please update your $ENV_FILE file with actual values"
    exit 1
fi

print_success "Environment variables configured ✓"

# Install dependencies
print_status "Installing dependencies..."

# Install root dependencies
if [ -f "package.json" ]; then
    print_status "Installing root dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        print_error "Failed to install root dependencies"
        exit 1
    fi
    print_success "Root dependencies installed ✓"
fi

# Install Lambda dependencies
print_status "Installing Lambda dependencies..."
cd lambda
npm install
if [ $? -ne 0 ]; then
    print_error "Failed to install Lambda dependencies"
    exit 1
fi
cd ..
print_success "Lambda dependencies installed ✓"

# Install recreation-gov script dependencies
print_status "Installing recreation-gov script dependencies..."
cd scripts/recreation-gov
npm install
if [ $? -ne 0 ]; then
    print_error "Failed to install recreation-gov dependencies"
    exit 1
fi
cd ../..
print_success "Recreation-gov dependencies installed ✓"

# Deploy to AWS
print_status "Deploying to AWS Lambda..."

# Ask for deployment stage
read -p "Enter deployment stage [dev]: " STAGE
STAGE=${STAGE:-dev}

print_status "Deploying to stage: $STAGE"

# Deploy with serverless
if ! serverless deploy --stage "$STAGE"; then
    print_error "Deployment failed!"
    exit 1
fi

print_success "Deployment completed successfully! ✓"

# Get deployment info
print_status "Getting deployment information..."
DEPLOY_INFO=$(serverless info --stage "$STAGE")
echo "$DEPLOY_INFO"

# Extract API Gateway URL
API_URL=$(echo "$DEPLOY_INFO" | grep -o 'https://[a-zA-Z0-9]*.execute-api.[a-zA-Z0-9-]*.amazonaws.com/[a-zA-Z0-9]*' | head -1)

if [ -n "$API_URL" ]; then
    print_success "API Gateway URL: $API_URL"
    
    # Test health endpoint
    print_status "Testing health endpoint..."
    if command_exists curl; then
        HEALTH_RESPONSE=$(curl -s "$API_URL/healthz" || echo "curl failed")
        if [[ "$HEALTH_RESPONSE" == *"ok"* ]]; then
            print_success "Health check passed ✓"
        else
            print_warning "Health check failed. Response: $HEALTH_RESPONSE"
        fi
    else
        print_warning "curl not available. Please test manually: $API_URL/healthz"
    fi
    
    print_status ""
    print_status "🎉 Deployment Complete!"
    print_status "======================"
    print_status ""
    print_status "Health Endpoint: $API_URL/healthz"
    print_status "Trigger Endpoint: $API_URL/cron/fetch-availability"
    print_status ""
    print_status "Example usage:"
    print_status "curl \"$API_URL/cron/fetch-availability?token=$CRON_TOKEN\""
    print_status ""
    print_status "For more usage examples, see LAMBDA_DEPLOYMENT_GUIDE.md"
else
    print_warning "Could not extract API Gateway URL from deployment info"
fi

print_status ""
print_status "Useful commands:"
print_status "  View logs: serverless logs --function worker --tail --stage $STAGE"
print_status "  Update worker: serverless deploy function --function worker --stage $STAGE"
print_status "  Remove deployment: serverless remove --stage $STAGE"
print_status ""
print_success "Setup completed successfully! 🎉" 