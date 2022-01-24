read -e -p 'What is your Edit Mirror ID? ' id
read -e -p 'How many years of experience do you have programming in statically-typed functional programming languages (such as Elm)? ' experience

read -e -p 'Where would you like to install Edit Mirror? Please ensure that the directory you enter is in your PATH. [blank for ~/bin] ' installation_dir
installation_dir=${dir:-~/bin}

mkdir -p $installation_dir
cd $installation_dir

# TODO update git URL
repo_dir='edit-mirror-repo'
git clone git@github.com:justinlubin/edit-mirror.git $repo_dir

ln -s $repo_dir/edit-mirror.sh edit-mirror
chmod 755 edit-mirror

echo '{"id": "'$id'", "experience": "'$experience'"}' \
  > $repo_dir/user-data.txt
