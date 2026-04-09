@echo off
title Ellie — domain setup (Vercel + GoDaddy)
echo Opens Vercel dashboard and GoDaddy DNS in your browser.
echo Follow DOMAIN_SETUP.txt in this folder.
echo.
start "" "https://vercel.com/dashboard"
start "" "https://dnsmanagement.godaddy.com/dns/stylebyellie.com"
start "" "https://vercel.com/docs/concepts/projects/domains"
exit /b 0
