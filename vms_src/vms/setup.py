from setuptools import setup, find_packages

with open("requirements.txt") as f:
    install_requires = f.read().strip().split("\n")

from vms import __version__ as version

setup(
    name="vms",
    version=version,
    description="Native Frappe v16 / ERPNext v16 Vehicle Management System",
    author="Keerthi Groups Hardware",
    author_email="engineering@keerthigroups.com",
    packages=find_packages(),
    zip_safe=False,
    include_package_data=True,
    install_requires=install_requires
)
