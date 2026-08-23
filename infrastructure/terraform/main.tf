terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

variable "aws_region" {
  type        = string
  default     = "us-east-1"
  description = "Target AWS Region"
}

variable "environment" {
  type        = string
  default     = "production"
  description = "Deployment environment"
}

# --- 1. Networking (VPC, Subnets, Gateways) ---
resource "aws_vpc" "nexus_vpc" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name        = "nexus-vpc-${var.environment}"
    Environment = var.environment
  }
}

resource "aws_subnet" "public_a" {
  vpc_id                  = aws_vpc.nexus_vpc.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = "${var.aws_region}a"
  map_public_ip_on_launch = true

  tags = {
    Name = "nexus-public-a"
  }
}

resource "aws_subnet" "public_b" {
  vpc_id                  = aws_vpc.nexus_vpc.id
  cidr_block              = "10.0.2.0/24"
  availability_zone       = "${var.aws_region}b"
  map_public_ip_on_launch = true

  tags = {
    Name = "nexus-public-b"
  }
}

resource "aws_subnet" "private_a" {
  vpc_id            = aws_vpc.nexus_vpc.id
  cidr_block        = "10.0.10.0/24"
  availability_zone = "${var.aws_region}a"

  tags = {
    Name = "nexus-private-a"
  }
}

resource "aws_subnet" "private_b" {
  vpc_id            = aws_vpc.nexus_vpc.id
  cidr_block        = "10.0.11.0/24"
  availability_zone = "${var.aws_region}b"

  tags = {
    Name = "nexus-private-b"
  }
}

# --- 2. AWS Secrets Manager (JWT Signing Key) ---
resource "aws_secretsmanager_secret" "jwt_signing_key" {
  name                    = "nexus/jwt-signing-key"
  description             = "HS256 JWT Signing Secret for NEXUS Cloud Identity Platform"
  recovery_window_in_days = 0

  tags = {
    Environment = var.environment
  }
}

# --- 3. Persistent Relational Store (RDS PostgreSQL) ---
resource "aws_db_subnet_group" "nexus_db_subnets" {
  name       = "nexus-db-subnet-group"
  subnet_ids = [aws_subnet.private_a.id, aws_subnet.private_b.id]
}

resource "aws_db_instance" "nexus_postgres" {
  identifier             = "nexus-postgres-${var.environment}"
  engine                 = "postgres"
  engine_version         = "16.1"
  instance_class         = "db.t4g.micro"
  allocated_storage      = 20
  db_name                = "nexus_identity"
  username               = "nexus_admin"
  password               = "ChangeMeInProductionVault2026!" # Loaded from Secrets Manager in real deploy
  db_subnet_group_name   = aws_db_subnet_group.nexus_db_subnets.name
  skip_final_snapshot    = true
  storage_encrypted      = true
  publicly_accessible    = false

  tags = {
    Environment = var.environment
  }
}

# --- 4. Elasticache Redis (Rate Limiting Cluster) ---
resource "aws_elasticache_subnet_group" "nexus_redis_subnets" {
  name       = "nexus-redis-subnet-group"
  subnet_ids = [aws_subnet.private_a.id, aws_subnet.private_b.id]
}

resource "aws_elasticache_cluster" "nexus_redis" {
  cluster_id           = "nexus-redis-${var.environment}"
  engine               = "redis"
  node_type            = "cache.t4g.micro"
  num_cache_nodes      = 1
  parameter_group_name = "default.redis7"
  port                 = 6379
  subnet_group_name    = aws_elasticache_subnet_group.nexus_redis_subnets.name

  tags = {
    Environment = var.environment
  }
}

# --- 5. ECS Fargate Cluster (Go Backend Service) ---
resource "aws_ecs_cluster" "nexus_cluster" {
  name = "nexus-cluster-${var.environment}"
}

# --- 6. Application Load Balancer & CloudFront ---
resource "aws_lb" "nexus_alb" {
  name               = "nexus-alb-${var.environment}"
  internal           = false
  load_balancer_type = "application"
  subnets            = [aws_subnet.public_a.id, aws_subnet.public_b.id]

  tags = {
    Environment = var.environment
  }
}

# --- Outputs ---
output "alb_dns_name" {
  value       = aws_lb.nexus_alb.dns_name
  description = "Public DNS for Application Load Balancer"
}

output "secrets_manager_arn" {
  value       = aws_secretsmanager_secret.jwt_signing_key.arn
  description = "ARN for JWT Secrets Manager Secret"
}
