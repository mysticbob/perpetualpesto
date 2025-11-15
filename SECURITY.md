# Security Policy

## Reporting Security Vulnerabilities

If you discover a security vulnerability, please email the maintainers directly instead of creating a public issue.

## Security Best Practices

### Environment Variables

- **NEVER** commit `.env` files to version control
- Always use `.env.example` as a template with dummy values
- Rotate API keys and secrets regularly
- Use strong, unique passwords for database connections

### Dependencies

- Run `bun audit` or `npm audit` regularly
- Keep dependencies up to date
- Review security advisories for critical packages
- Use exact versions for critical security packages

### API Security

- Always validate and sanitize user input
- Use parameterized queries to prevent SQL injection
- Implement rate limiting on API endpoints
- Use HTTPS in production
- Set proper CORS headers

### Authentication

- Use secure session management
- Implement proper password hashing (bcrypt, argon2)
- Enable CSRF protection
- Use secure cookies in production (`secure: true`, `httpOnly: true`, `sameSite: 'strict'`)

### Code Quality

- Run `bun lint` before committing
- Fix all TypeScript errors and warnings
- Follow the principle of least privilege
- Implement proper error handling without exposing sensitive information

## Security Headers

This application implements the following security headers:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`

Additional headers should be configured in production:
- `Strict-Transport-Security`
- `Content-Security-Policy`

## Dependencies Security

Current security status:
- Run `bun audit` to check for vulnerabilities
- Keep all dependencies updated with `bun update`
- Review breaking changes before major version upgrades

## Deployment Security

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Use environment variables for all secrets
- [ ] Enable HTTPS/TLS
- [ ] Configure firewall rules
- [ ] Set up monitoring and alerting
- [ ] Enable database backups
- [ ] Review and harden CORS settings
- [ ] Use security headers middleware
- [ ] Implement rate limiting
- [ ] Set up proper logging (without sensitive data)
