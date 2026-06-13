curl -fsSL https://www.zot.sh/install.sh | bash -s -- v0.0.1 ~/bin
curl -fsSL https://www.zot.sh/install.sh | bash
cp .env.example .env
git clone https://github.com/pewdiepie-archdaemon/odysseus.git
cd odysseus
docker --version
pkg update -y
pkg install git -y
ls -la
find . -maxdepth 2 -type f | sort
~ $ docker --version
The program docker is not installed. Install it by executing:
~ $ pkg update -y
Get:1 https://termux.net stable InRelease [1089 B]
Get:2 https://termux.net stable/main aarch64 Packages [254 kB]
Fetched 255 kB in 1s (249 kB/s)
22 packages can be upgraded. Run 'apt list --upgradable' to see them.
~ $ pkg install git -y
Installing:
Installing dependencies:
Suggested packages:
Summary:
Get:1 https://termux.net stable/main aarch64 libexpat aarch64 2.8.1 [93.7 kB]
Get:2 https://termux.net stable/main aarch64 git aarch64 2.54.0 [5022 kB]
Get:3 https://termux.net stable/main aarch64 resolv-conf aarch64 1.3 [992 B]
Get:4 https://termux.net stable/main aarch64 libresolv-wrapper aarch64 1.1.7-6 [11.3 kB]
Get:5 https://termux.net stable/main aarch64 libdb aarch64 18.1.40-5 [499 kB]
Get:6 https://termux.net stable/main aarch64 krb5 aarch64 1.22.2 [897 kB]
Get:7 https://termux.net stable/main aarch64 ldns aarch64 1.8.4-1 [303 kB]
Get:8 https://termux.net stable/main aarch64 libedit aarch64 20240517-3.1-1 [79.2 kB]
Get:9 https://termux.net stable/main aarch64 openssh-sftp-server aarch64 10.3p1-1 [55.8 kB]
Get:10 https://termux.net stable/main aarch64 termux-auth aarch64 1.5.0-1 [7020 B]
Get:11 https://termux.net stable/main aarch64 openssh aarch64 10.3p1-1 [905 kB]
Fetched 7874 kB in 4s (2135 kB/s)
git clone https://github.com/pewdiepie-archdaemon/odysseus.git
cd odysseusSelecting previously unselected package libexpat.
(Reading database ... 3790 files and directories currently installed.)
Preparing to unpack .../00-libexpat_2.8.1_aarch64.deb ...
Unpacking libexpat (2.8.1) ...
Selecting previously unselected package git.
Preparing to unpack .../01-git_2.54.0_aarch64.deb ...
Unpacking git (2.54.0) ...
Selecting previously unselected package resolv-conf.
Preparing to unpack .../02-resolv-conf_1.3_aarch64.deb ...
Unpacking resolv-conf (1.3) ...
Selecting previously unselected package libresolv-wrapper.
Preparing to unpack .../03-libresolv-wrapper_1.1.7-6_aarch64.deb ...
Unpacking libresolv-wrapper (1.1.7-6) ...
Selecting previously unselected package libdb.
Preparing to unpack .../04-libdb_18.1.40-5_aarch64.deb ...
Unpacking libdb (18.1.40-5) ...
Selecting previously unselected package krb5.
Preparing to unpack .../05-krb5_1.22.2_aarch64.deb ...
Unpacking krb5 (1.22.2) ...
Selecting previously unselected package ldns.
Preparing to unpack .../06-ldns_1.8.4-1_aarch64.deb ...
Unpacking ldns (1.8.4-1) ...
Selecting previously unselected package libedit.
Preparing to unpack .../07-libedit_20240517-3.1-1_aarch64.deb ...
Unpacking libedit (20240517-3.1-1) ...
Selecting previously unselected package openssh-sftp-server.
Preparing to unpack .../08-openssh-sftp-server_10.3p1-1_aarch64.deb ...
Unpacking openssh-sftp-server (10.3p1-1) ...
Selecting previously unselected package termux-auth.
Preparing to unpack .../09-termux-auth_1.5.0-1_aarch64.deb ...
Unpacking termux-auth (1.5.0-1) ...
Selecting previously unselected package openssh.
Preparing to unpack .../10-openssh_10.3p1-1_aarch64.deb ...
Unpacking openssh (10.3p1-1) ...
Setting up libedit (20240517-3.1-1) ...
Setting up openssh-sftp-server (10.3p1-1) ...
Setting up resolv-conf (1.3) ...
Setting up ldns (1.8.4-1) ...
Setting up libexpat (2.8.1) ...
Setting up git (2.54.0) ...
Setting up libresolv-wrapper (1.1.7-6) ...
Setting up termux-auth (1.5.0-1) ...
Setting up libdb (18.1.40-5) ...
Setting up krb5 (1.22.2) ...
Setting up openssh (10.3p1-1) ...
Generating public/private rsa key pair.
Your identification has been saved in /data/data/com.termux/files/usr/etc/ssh/ssh_host_rsa_key
Your public key has been saved in /data/data/com.termux/files/usr/etc/ssh/ssh_host_rsa_key.pub
The key fingerprint is:
SHA256:uYupF77RbY8Pv3ud/ZahzTs4z7zClJRJwlEuuOO5GzA u0_a383@localhost
The key's randomart image is:
+---[RSA 3072]----+
|          ..o.   |
|          .o..   |
|         . .o.o  |
|         .. .+   |
|       ESo  . .  |
|      ..+oo  o . |
|     ...o++ o =.=|
|      o+ oo= *+*+|
|    .o+..oo.*++B*|
+----[SHA256]-----+
Generating public/private ecdsa key pair.
Your identification has been saved in /data/data/com.termux/files/usr/etc/ssh/ssh_host_ecdsa_key
Your public key has been saved in /data/data/com.termux/files/usr/etc/ssh/ssh_host_ecdsa_key.pub
The key fingerprint is:
SHA256:FnWIwkFjHr/Dd4hwwhn46Ho3SbDVx5/5Hr7jBbqx4rQ u0_a383@localhost
The key's randomart image is:
+---[ECDSA 256]---+
|     +B. ....    |
|    .+o*....     |
|     o*o+.       |
|    o o=.+o.     |
|   . +  S.o..o.  |
|    o .. o .+. . |
|   . . .  . o.. .|
|  . . +  ... =oo |
|   . . . .E.oo=o |
+----[SHA256]-----+
Generating public/private ed25519 key pair.
Your identification has been saved in /data/data/com.termux/files/usr/etc/ssh/ssh_host_ed25519_key
Your public key has been saved in /data/data/com.termux/files/usr/etc/ssh/ssh_host_ed25519_key.pub
The key fingerprint is:
SHA256:w2PclpjFE0eRn1F8HRNKNH9TOC7Zdod9+a3qAlHl1lc u0_a383@localhost
The key's randomart image is:
+--[ED25519 256]--+
|          .o** BE|
|         ..+o.B B|
|         .+ o*.O=|
|       o.= +o BoB|
|        S.+  o .=|
|       ..+      o|
|         .     . |
|          .   .  |
|           oo.   |
+----[SHA256]-----+

If you plan to use the 'ssh-agent'
it is recommended to run it as a service.
Run 'pkg i termux-services'
to install the ('runit') service manager

You can enable the ssh-agent service
using 'sv-enable ssh-agent'
You can also enable sshd to autostart

pkg update -y
pkg install git -y

git clone https://github.com/pewdiepie-archdaemon/odysseus.git
cd odysseus
pkg update -y
pkg install git -y
git clone https://github.com/pewdiepie-archdaemon/odysseus.git
cd odysseusdocker --version
docker --version
pkg install root-repo
apt list --upgradable

pkg install docker
docker --version
git clone https://github.com/pewdiepie-archdaemon/odysseus.git
cd odysseus
docker compose version
docker-compose --version
docker version
docker ps
which docker
uname -a
docker ps
su
ls -la
find . -maxdepth 2 -type f | sort
python --version
pkg install python
python --version
python -m venv .venv
source .venv/bin/activate
pip install --upgrade pip setuptools wheel
pip install -r requirements.txt
cp .env.example .env
python app.py
python -m venv .venv
source .venv/bin/activate
pip install --upgrade pip setuptools wheel
pip install -r requirements.txt
# Ensure storage permissions are active
termux-setup-storage
# Navigate to your home directory and clone the target repo
cd ~
git clone https://github.com/Carai868/DevOS.git
cd DevOS
# Sync contents from the first directory shown in 1000193884.jpg
rsync -av ~/storage/shared/Downloads/Carai\ Agency/DevOS-main\ \(2\)/DevOS-main/ .
# Check what was added, stage them, and commit
git status
git add .
git commit -m "Merge baseline frontend and backend from source 1"
pkg install rsync -y
# Run the sync again
rsync -av ~/storage/shared/Downloads/Carai\ Agency/DevOS-main\ \(2\)/DevOS-main/ .
# Verify the files are now staging area candidates
git status
# Stage and commit them
git add .
git commit -m "Merge baseline frontend and backend from source 1"
ls ~/storage/shared/Downloads/Carai\ Agency/DevOS-main\ \(2\)/DevOS-main
ls ~/storage/shared/Downloads/Carai\ Agency/DevOS\ Ai/DevOS-main-1/DevOS-main
Sudo ls ~/storage/shared/Downloads/Carai\ Agency/DevOS-main\ \(2\)/DevOS-main
find ~/storage/shared/ -type d -name "DevOS-main" 2>/dev/null
# Copy from the 'DevOS-main (2)' folder
cp -r "/data/data/com.termux/files/home/storage/shared/Download/Carai Agency/DevOS-main (2)/DevOS-main/"* .
# Copy from the 'DevOS-main (2)' folder
cp -r "/data/data/com.termux/files/home/storage/shared/Download/Carai Agency/DevOS-main (2)/DevOS-main/"* .
# Verify the files are now in your workspace
git status
# Stage and commit
git add .
git commit -m "Merge baseline frontend and backend from source 1"
# Copy from the 'DevOS-main (2)' folder
cp -r "/data/data/com.termux/files/home/storage/shared/Download/Carai Agency/DevOS-main (2)/DevOS-main/"* .
# Verify the files are now in your workspace
git status
# Stage and commit
git add .
git commit -m "Merge baseline frontend and backend from source 1"
# Layer the files from the 'DevOS Ai' folder over it
cp -r "/data/data/com.termux/files/home/storage/shared/Download/Carai Agency/DevOS Ai/DevOS-main-1/DevOS-main/"* .
# Verify the added docker configurations and updates
git status
# Stage and commit
git add .
git commit -m "Layer docker configurations and updates from source 2"
git push origin main
Initialize the local directory as a git repository
git init
Link your existing GitHub repository
git remote add origin https://github.com/Carai868/DevOS.git
Fetch the remote tracking branches
git fetch origin
Set your local branch name to main
git branch -M main
Pull the existing history from GitHub to merge the environments
git pull origin main --allow-unrelated-histories
