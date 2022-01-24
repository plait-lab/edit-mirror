read -e -p "Enter installation directory [blank for ~/bin]: " dir
dir=${dir:-~/bin}

mkdir -p $dir
cd $dir

# TODO update git URL
git clone git@github.com:justinlubin/edit-mirror.git edit-mirror-repo

ln -s edit-mirror-repo/edit-mirror.sh edit-mirror
chmod 755 edit-mirror
